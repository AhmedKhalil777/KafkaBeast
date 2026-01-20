using KafkaBeast.Dashboard.Models;
using KafkaBeast.Dashboard.Services;
using Microsoft.AspNetCore.SignalR;

namespace KafkaBeast.Dashboard.Hubs;

public class KafkaHub : Hub
{
    private readonly KafkaConsumerService _consumerService;
    private readonly ILogger<KafkaHub> _logger;
    private readonly Dictionary<string, CancellationTokenSource> _activeConsumers = new();

    public KafkaHub(
        KafkaConsumerService consumerService,
        ILogger<KafkaHub> logger)
    {
        _consumerService = consumerService;
        _logger = logger;
    }

    public async Task StartConsuming(ConsumeMessageRequest request)
    {
        var connectionId = Context.ConnectionId;
        var consumerKey = $"{connectionId}-{request.ConnectionId}-{request.Topic}";

        if (_activeConsumers.ContainsKey(consumerKey))
        {
            await Clients.Caller.SendAsync("Error", "Consumption already started for this topic");
            return;
        }

        var cts = new CancellationTokenSource();
        _activeConsumers[consumerKey] = cts;

        _logger.LogInformation("Starting consumption for connection {ConnectionId}, topic {Topic}", connectionId, request.Topic);

        _ = Task.Run(async () =>
        {
            try
            {
                await _consumerService.StartContinuousConsumptionAsync(
                    request,
                    async (message) =>
                    {
                        await Clients.Caller.SendAsync("MessageReceived", message);
                    },
                    cts.Token);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Consumption stopped for connection {ConnectionId}, topic {Topic}", connectionId, request.Topic);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in consumption for connection {ConnectionId}, topic {Topic}", connectionId, request.Topic);
                await Clients.Caller.SendAsync("Error", $"Error consuming messages: {ex.Message}");
            }
            finally
            {
                try
                {
					_activeConsumers.Remove(consumerKey, out _);

				}
				catch (Exception)
                {

                }
            }
        }, cts.Token);
    }

    public Task StopConsuming(string connectionId, string topic)
    {
        var consumerKey = $"{Context.ConnectionId}-{connectionId}-{topic}";
        if (_activeConsumers.TryGetValue(consumerKey, out var cts))
        {
            cts.Cancel();
            _activeConsumers.Remove(consumerKey);
            _logger.LogInformation("Stopped consumption for connection {ConnectionId}, topic {Topic}", Context.ConnectionId, topic);
        }
        return Task.CompletedTask;
    }

    public override Task OnDisconnectedAsync(Exception? exception)
    {
        // Cancel all active consumers for this connection
        var connectionId = Context.ConnectionId;
        var keysToRemove = _activeConsumers.Keys
            .Where(k => k.StartsWith(connectionId))
            .ToList();

        foreach (var key in keysToRemove)
        {
            if (_activeConsumers.TryGetValue(key, out var cts))
            {
                cts.Cancel();
                _activeConsumers.Remove(key);
            }
        }

        _logger.LogInformation("Client disconnected: {ConnectionId}", connectionId);
        return base.OnDisconnectedAsync(exception);
    }
}

