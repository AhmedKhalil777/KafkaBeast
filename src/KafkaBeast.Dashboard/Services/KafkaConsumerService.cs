using System;
using Confluent.Kafka;
using KafkaBeast.Dashboard.Models;
using KafkaBeast.Dashboard.Hubs;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace KafkaBeast.Dashboard.Services;

public class KafkaConsumerService
{
    private readonly KafkaConnectionService _connectionService;
    private readonly SerializationService _serializationService;
    private readonly ILogger<KafkaConsumerService> _logger;
    private readonly IHubContext<KafkaHub> _hubContext;
    private readonly ConcurrentDictionary<string, IConsumer<byte[], byte[]>> _consumers = new();
    private readonly ConcurrentDictionary<string, CancellationTokenSource> _cancellationTokens = new();

    public KafkaConsumerService(
        KafkaConnectionService connectionService,
        SerializationService serializationService,
        ILogger<KafkaConsumerService> logger,
        IHubContext<KafkaHub> hubContext)
    {
        _connectionService = connectionService;
        _serializationService = serializationService;
        _logger = logger;
        _hubContext = hubContext;
    }

    private IConsumer<byte[], byte[]> CreateConsumer(string connectionId, ConsumeMessageRequest request)
    {
        var connection = _connectionService.GetConnectionAsync(connectionId).Result;
        if (connection == null)
        {
            throw new InvalidOperationException($"Connection {connectionId} not found");
        }

        var groupId = !string.IsNullOrWhiteSpace(request.GroupId) 
            ? request.GroupId 
            : $"kafkabeast-consumer-{Guid.NewGuid()}";

        var config = new ConsumerConfig
        {
            AutoOffsetReset = request.AutoOffsetReset ? AutoOffsetReset.Earliest : AutoOffsetReset.Latest,
            EnableAutoCommit = false,
            SessionTimeoutMs = 30000,
            HeartbeatIntervalMs = 3000,
            ApiVersionRequestTimeoutMs = 10000
        };
        
        KafkaConfigHelper.ApplyConsumerSettings(config, connection);
        config.EnableAutoCommit = false;
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

        var (keyValue, keyError) = _serializationService.Deserialize(result.Message.Key, request.KeySerialization, config);
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

    private async Task PushMessageToSignalRAsync(string clientConnectionId, ConsumedMessage message)
    {
        try
        {
            await _hubContext.Clients.Client(clientConnectionId).SendAsync("MessageReceived", message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error pushing message to SignalR client {ClientConnectionId}", clientConnectionId);
        }
    }

    private async Task PushErrorToSignalRAsync(string clientConnectionId, string error)
    {
        try
        {
            await _hubContext.Clients.Client(clientConnectionId).SendAsync("Error", error);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error pushing error message to SignalR client {ClientConnectionId}", clientConnectionId);
        }
    }

    /// <summary>
    /// Start real-time consumption via SignalR. Messages are pushed to the client as they arrive.
    /// </summary>
    public async Task StartContinuousConsumptionAsync(
        string clientConnectionId,
        ConsumeMessageRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.GroupId))
        {
            await PushErrorToSignalRAsync(clientConnectionId, "Consumer Group ID is required");
            return;
        }

        var consumerId = $"{request.ConnectionId}-{request.Topic}-{request.GroupId}";
        
        // Check if already consuming
        if (_cancellationTokens.ContainsKey(consumerId))
        {
            await PushErrorToSignalRAsync(clientConnectionId, "Already consuming from this topic with this group");
            return;
        }

        var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _cancellationTokens[consumerId] = cts;

        try
        {
            var consumer = CreateConsumer(request.ConnectionId, request);
            _consumers[consumerId] = consumer;
            consumer.Subscribe(request.Topic);

            _logger.LogInformation("Started real-time consumption from topic {Topic} for group {GroupId} with {KeyType}/{ValueType} deserialization", 
                request.Topic, request.GroupId, request.KeySerialization, request.ValueSerialization);

            while (!cts.Token.IsCancellationRequested)
            {
                try
                {
                    var result = consumer.Consume(cts.Token);
                    var consumedMessage = CreateConsumedMessage(result, request);
                    
                    await PushMessageToSignalRAsync(clientConnectionId, consumedMessage);
                }
                catch (ConsumeException ex)
                {
                    _logger.LogError(ex, "Error consuming message from topic {Topic}", request.Topic);
                    await PushErrorToSignalRAsync(clientConnectionId, $"Consume error: {ex.Message}");
                }
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Real-time consumption cancelled for topic {Topic}, group {GroupId}", request.Topic, request.GroupId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in real-time consumption from topic {Topic}", request.Topic);
            await PushErrorToSignalRAsync(clientConnectionId, $"Consumption error: {ex.Message}");
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

    /// <summary>
    /// Stop consumption for a specific topic and consumer group.
    /// </summary>
    public void StopConsumption(string connectionId, string topic, string groupId)
    {
        var consumerId = $"{connectionId}-{topic}-{groupId}";
        if (_cancellationTokens.TryGetValue(consumerId, out var cts))
        {
            cts.Cancel();
            _logger.LogInformation("Stopped consumption for topic {Topic}, group {GroupId}", topic, groupId);
        }
    }

    /// <summary>
    /// Cleanup all resources on shutdown.
    /// </summary>
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

