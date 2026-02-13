using Confluent.Kafka;
using KafkaBeast.Dashboard.Models;
using System.Collections.Concurrent;
using System.Text;

namespace KafkaBeast.Dashboard.Services;

public class KafkaConsumerService
{
    private readonly KafkaConnectionService _connectionService;
    private readonly SerializationService _serializationService;
    private readonly ILogger<KafkaConsumerService> _logger;
    private readonly ConcurrentDictionary<string, IConsumer<byte[], byte[]>> _consumers = new();
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _cancellationTokens = new();

    public KafkaConsumerService(
        KafkaConnectionService connectionService,
        SerializationService serializationService,
        ILogger<KafkaConsumerService> logger)
    {
        _connectionService = connectionService;
        _serializationService = serializationService;
        _logger = logger;
    }

    private IConsumer<byte[], byte[]> CreateConsumer(string connectionId, ConsumeMessageRequest request)
    {
        var connection = _connectionService.GetConnectionAsync(connectionId).Result;
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        var config = new ConsumerConfig
        {
            BootstrapServers = connection.BootstrapServers,
            GroupId = request.GroupId ?? $"kafka-beast-{Guid.NewGuid()}",
            AutoOffsetReset = request.AutoOffsetReset ? AutoOffsetReset.Earliest : AutoOffsetReset.Latest,
            EnableAutoCommit = true
        };

        if (connection.AdditionalConfig != null)
        {
            foreach (var kvp in connection.AdditionalConfig)
            {
                config.Set(kvp.Key, kvp.Value);
            }
        }

        var builder = new ConsumerBuilder<byte[], byte[]>(config);
        return builder.Build();
    }

    private ConsumedMessage CreateConsumedMessage(ConsumeResult<byte[], byte[]> result, ConsumeMessageRequest request)
    {
        var config = new SerializationConfig
        {
            KeySerialization = request.KeySerialization,
            ValueSerialization = request.ValueSerialization,
            SchemaRegistryUrl = request.SchemaRegistryUrl,
            AvroSchema = request.AvroSchema,
            ProtobufSchema = request.ProtobufSchema,
            PrettyPrintJson = true
        };

        // Deserialize key
        var (keyValue, keyError) = _serializationService.Deserialize(result.Message.Key, request.KeySerialization, config);
        
        // Deserialize value
        var (valueValue, valueError) = _serializationService.Deserialize(result.Message.Value, request.ValueSerialization, config);

        var consumedMessage = new ConsumedMessage
        {
            Topic = result.Topic,
            Key = keyValue,
            Value = valueValue ?? string.Empty,
            RawKeyBase64 = result.Message.Key != null ? Convert.ToBase64String(result.Message.Key) : null,
            RawValueBase64 = result.Message.Value != null ? Convert.ToBase64String(result.Message.Value) : null,
            Offset = result.Offset.Value,
            Partition = result.Partition.Value,
            Timestamp = result.Message.Timestamp.UtcDateTime,
            KeySerializationType = request.KeySerialization,
            ValueSerializationType = request.ValueSerialization,
            DeserializationError = keyError ?? valueError
        };

        if (result.Message.Headers != null)
        {
            consumedMessage.Headers = new Dictionary<string, string>();
            foreach (var header in result.Message.Headers)
            {
                consumedMessage.Headers[header.Key] = Encoding.UTF8.GetString(header.GetValueBytes());
            }
        }

        return consumedMessage;
    }

    public Task<List<ConsumedMessage>> ConsumeMessagesAsync(
        ConsumeMessageRequest request,
        int maxMessages = 10,
        TimeSpan? timeout = null)
    {
        var messages = new List<ConsumedMessage>();
        IConsumer<byte[], byte[]>? consumer = null;

        try
        {
            consumer = CreateConsumer(request.ConnectionId, request);
            consumer.Subscribe(request.Topic);

            var timeoutValue = timeout ?? TimeSpan.FromSeconds(5);
            var endTime = DateTime.UtcNow.Add(timeoutValue);

            while (messages.Count < maxMessages && DateTime.UtcNow < endTime)
            {
                var remainingTime = endTime - DateTime.UtcNow;
                var result = consumer.Consume(remainingTime);

                if (result == null)
                    break;

                var consumedMessage = CreateConsumedMessage(result, request);
                messages.Add(consumedMessage);
            }

            _logger.LogInformation("Consumed {Count} messages from topic {Topic} with {KeyType}/{ValueType} deserialization", 
                messages.Count, request.Topic, request.KeySerialization, request.ValueSerialization);

            return Task.FromResult(messages);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error consuming messages from topic {Topic}", request.Topic);
            throw;
        }
        finally
        {
            consumer?.Close();
            consumer?.Dispose();
        }
    }

    public async Task StartContinuousConsumptionAsync(
        ConsumeMessageRequest request,
        Func<ConsumedMessage, Task> onMessage,
        CancellationToken cancellationToken = default)
    {
        var consumerId = $"{request.ConnectionId}-{request.Topic}-{request.GroupId}";
        var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _cancellationTokens[consumerId] = cts;

        try
        {
            var consumer = CreateConsumer(request.ConnectionId, request);
            _consumers[consumerId] = consumer;
            consumer.Subscribe(request.Topic);

            _logger.LogInformation("Started continuous consumption from topic {Topic} with {KeyType}/{ValueType} deserialization", 
                request.Topic, request.KeySerialization, request.ValueSerialization);

            while (!cts.Token.IsCancellationRequested)
            {
                try
                {
                    var result = consumer.Consume(cts.Token);
                    var consumedMessage = CreateConsumedMessage(result, request);
                    await onMessage(consumedMessage);
                }
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex, "Error consuming message");
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Consumption cancelled for topic {Topic}", request.Topic);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in continuous consumption from topic {Topic}", request.Topic);
            throw;
        }
        finally
        {
            if (_consumers.TryRemove(consumerId, out var consumer))
            {
                consumer.Close();
                consumer.Dispose();
            }
            _cancellationTokens.TryRemove(consumerId, out _);
        }
    }

    public void StopConsumption(string connectionId, string topic, string? groupId = null)
    {
        var consumerId = $"{connectionId}-{topic}-{groupId ?? "*"}";
        if (_cancellationTokens.TryGetValue(consumerId, out var cts))
        {
            cts.Cancel();
        }
    }

    public void DisposeAll()
    {
        foreach (var cts in _cancellationTokens.Values)
        {
            cts.Cancel();
            cts.Dispose();
        }
        _cancellationTokens.Clear();

        foreach (var consumer in _consumers.Values)
        {
            consumer.Close();
            consumer.Dispose();
        }
        _consumers.Clear();
    }
}

