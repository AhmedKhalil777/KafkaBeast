using Confluent.Kafka;
using KafkaBeast.Dashboard.Models;
using System.Collections.Concurrent;
using System.Text;

namespace KafkaBeast.Dashboard.Services;

public class KafkaProducerService
{
    private readonly KafkaConnectionService _connectionService;
    private readonly ILogger<KafkaProducerService> _logger;
    private readonly ConcurrentDictionary<string, IProducer<string, string>> _producers = new();

    public KafkaProducerService(
        KafkaConnectionService connectionService,
        ILogger<KafkaProducerService> logger)
    {
        _connectionService = connectionService;
        _logger = logger;
    }

    private IProducer<string, string> GetOrCreateProducer(string connectionId)
    {
        return _producers.GetOrAdd(connectionId, id =>
        {
            var connection = _connectionService.GetConnectionAsync(id).Result;
            if (connection == null)
            {
                throw new InvalidOperationException($"Connection {id} not found");
            }

            var config = new ProducerConfig
            {
                BootstrapServers = connection.BootstrapServers
            };

            if (connection.AdditionalConfig != null)
            {
                foreach (var kvp in connection.AdditionalConfig)
                {
                    config.Set(kvp.Key, kvp.Value);
                }
            }

            var builder = new ProducerBuilder<string, string>(config);
            return builder.Build();
        });
    }

    public async Task<DeliveryResult<string, string>> ProduceMessageAsync(ProduceMessageRequest request)
    {
        try
        {
            var producer = GetOrCreateProducer(request.ConnectionId);
            
            var message = new Message<string, string>
            {
                Key = request.Key,
                Value = request.Message
            };

            if (request.Headers != null && request.Headers.Any())
            {
                message.Headers = new Headers();
                foreach (var header in request.Headers)
                {
                    message.Headers.Add(header.Key, Encoding.UTF8.GetBytes(header.Value));
                }
            }

            var result = await producer.ProduceAsync(request.Topic, message);
            _logger.LogInformation("Message produced to topic {Topic} at offset {Offset}", request.Topic, result.Offset);
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error producing message to topic {Topic}", request.Topic);
            throw;
        }
    }

    public void DisposeProducer(string connectionId)
    {
        if (_producers.TryRemove(connectionId, out var producer))
        {
            producer.Dispose();
        }
    }

    public void DisposeAll()
    {
        foreach (var producer in _producers.Values)
        {
            producer.Dispose();
        }
        _producers.Clear();
    }
}

