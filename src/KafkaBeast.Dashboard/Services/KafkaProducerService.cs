using Confluent.Kafka;
using KafkaBeast.Dashboard.Models;
using System.Collections.Concurrent;
using System.Text;

namespace KafkaBeast.Dashboard.Services;

public class KafkaProducerService
{
    private readonly KafkaConnectionService _connectionService;
    private readonly SerializationService _serializationService;
    private readonly ILogger<KafkaProducerService> _logger;
    private readonly ConcurrentDictionary<string, IProducer<byte[], byte[]>> _producers = new();

    public KafkaProducerService(
        KafkaConnectionService connectionService,
        SerializationService serializationService,
        ILogger<KafkaProducerService> logger)
    {
        _connectionService = connectionService;
        _serializationService = serializationService;
        _logger = logger;
    }

    private IProducer<byte[], byte[]> GetOrCreateProducer(string connectionId)
    {
        return _producers.GetOrAdd(connectionId, id =>
        {
            var connection = _connectionService.GetConnectionAsync(id).Result;
            if (connection == null)
            {
                throw new InvalidOperationException($"Connection {id} not found");
            }

            var config = new ProducerConfig();
            KafkaConfigHelper.ApplyProducerSettings(config, connection);
            
            // Set defaults if not specified
            if (!connection.Acks.HasValue)
            {
                config.Acks = Confluent.Kafka.Acks.All;
            }
            if (!connection.EnableIdempotence.HasValue)
            {
                config.EnableIdempotence = true;
            }
            if (!connection.MaxInFlight.HasValue)
            {
                config.MaxInFlight = 5;
            }
            config.MessageSendMaxRetries = 3;

            var builder = new ProducerBuilder<byte[], byte[]>(config);
            return builder.Build();
        });
    }

    public async Task<ProduceResult> ProduceMessageAsync(ProduceMessageRequest request)
    {
        try
        {
            var producer = GetOrCreateProducer(request.ConnectionId);
            
            var config = new SerializationConfig
            {
                KeySerialization = request.KeySerialization,
                ValueSerialization = request.ValueSerialization,
                SchemaRegistryUrl = request.SchemaRegistryUrl,
                AvroSchema = request.AvroSchema,
                ProtobufSchema = request.ProtobufSchema
            };

            // Serialize key and value
            var keyBytes = request.Key != null 
                ? _serializationService.Serialize(request.Key, request.KeySerialization, config)
                : null;
            var valueBytes = _serializationService.Serialize(request.Message, request.ValueSerialization, config);

            var message = new Message<byte[], byte[]>
            {
                Key = keyBytes,
                Value = valueBytes
            };

            if (request.Headers != null && request.Headers.Any())
            {
                message.Headers = new Headers();
                foreach (var header in request.Headers)
                {
                    message.Headers.Add(header.Key, Encoding.UTF8.GetBytes(header.Value));
                }
            }

            DeliveryResult<byte[], byte[]> result;
            
            if (request.Partition.HasValue)
            {
                var topicPartition = new TopicPartition(request.Topic, new Partition(request.Partition.Value));
                result = await producer.ProduceAsync(topicPartition, message);
            }
            else
            {
                result = await producer.ProduceAsync(request.Topic, message);
            }
            
            _logger.LogInformation("Message produced to topic {Topic} at partition {Partition} offset {Offset} with {KeyType}/{ValueType} serialization", 
                request.Topic, result.Partition.Value, result.Offset, request.KeySerialization, request.ValueSerialization);
            
            return new ProduceResult
            {
                Topic = result.Topic,
                Partition = result.Partition.Value,
                Offset = result.Offset.Value,
                Timestamp = result.Timestamp.UtcDateTime,
                KeySerialization = request.KeySerialization,
                ValueSerialization = request.ValueSerialization
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error producing message to topic {Topic}", request.Topic);
            throw;
        }
    }

    public async Task<BatchProduceResponse> ProduceBatchAsync(BatchProduceRequest request, SerializationType keySerialization = SerializationType.String, SerializationType valueSerialization = SerializationType.String)
    {
        var response = new BatchProduceResponse
        {
            Results = new List<BatchProduceResult>()
        };

        try
        {
            var producer = GetOrCreateProducer(request.ConnectionId);
            var tasks = new List<Task<(int Index, DeliveryResult<byte[], byte[]>? Result, string? Error)>>();

            var config = new SerializationConfig
            {
                KeySerialization = keySerialization,
                ValueSerialization = valueSerialization
            };

            for (int i = 0; i < request.Messages.Count; i++)
            {
                var index = i;
                var msg = request.Messages[i];
                
                var keyBytes = msg.Key != null 
                    ? _serializationService.Serialize(msg.Key, keySerialization, config)
                    : null;
                var valueBytes = _serializationService.Serialize(msg.Value, valueSerialization, config);

                var message = new Message<byte[], byte[]>
                {
                    Key = keyBytes,
                    Value = valueBytes
                };

                if (msg.Headers != null && msg.Headers.Any())
                {
                    message.Headers = new Headers();
                    foreach (var header in msg.Headers)
                    {
                        message.Headers.Add(header.Key, Encoding.UTF8.GetBytes(header.Value));
                    }
                }

                tasks.Add(ProduceWithResultAsync(producer, request.Topic, message, index));
            }

            var results = await Task.WhenAll(tasks);

            foreach (var (index, result, error) in results)
            {
                if (result != null)
                {
                    response.SuccessCount++;
                    response.Results.Add(new BatchProduceResult
                    {
                        Index = index,
                        Success = true,
                        Partition = result.Partition.Value,
                        Offset = result.Offset.Value
                    });
                }
                else
                {
                    response.FailureCount++;
                    response.Results.Add(new BatchProduceResult
                    {
                        Index = index,
                        Success = false,
                        Error = error
                    });
                }
            }

            _logger.LogInformation("Batch produce completed: {Success} succeeded, {Failed} failed", 
                response.SuccessCount, response.FailureCount);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in batch produce to topic {Topic}", request.Topic);
            throw;
        }

        return response;
    }

    private async Task<(int Index, DeliveryResult<byte[], byte[]>? Result, string? Error)> ProduceWithResultAsync(
        IProducer<byte[], byte[]> producer, 
        string topic, 
        Message<byte[], byte[]> message, 
        int index)
    {
        try
        {
            var result = await producer.ProduceAsync(topic, message);
            return (index, result, null);
        }
        catch (Exception ex)
        {
            return (index, null, ex.Message);
        }
    }

    public void FlushProducer(string connectionId, TimeSpan? timeout = null)
    {
        if (_producers.TryGetValue(connectionId, out var producer))
        {
            producer.Flush(timeout ?? TimeSpan.FromSeconds(30));
        }
    }

    public void DisposeProducer(string connectionId)
    {
        if (_producers.TryRemove(connectionId, out var producer))
        {
            producer.Flush(TimeSpan.FromSeconds(10));
            producer.Dispose();
        }
    }

    public void DisposeAll()
    {
        foreach (var kvp in _producers)
        {
            kvp.Value.Flush(TimeSpan.FromSeconds(5));
            kvp.Value.Dispose();
        }
        _producers.Clear();
    }
}

public class ProduceResult
{
    public string Topic { get; set; } = string.Empty;
    public int Partition { get; set; }
    public long Offset { get; set; }
    public DateTime Timestamp { get; set; }
    public SerializationType KeySerialization { get; set; }
    public SerializationType ValueSerialization { get; set; }
}

