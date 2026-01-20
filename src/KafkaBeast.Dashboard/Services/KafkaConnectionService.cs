using KafkaBeast.Dashboard.Models;
using System.Collections.Concurrent;

namespace KafkaBeast.Dashboard.Services;

public class KafkaConnectionService
{
    private readonly ConcurrentDictionary<string, KafkaConnection> _connections = new();

    public Task<List<KafkaConnection>> GetAllConnectionsAsync()
    {
        return Task.FromResult(_connections.Values.ToList());
    }

    public Task<KafkaConnection?> GetConnectionAsync(string id)
    {
        _connections.TryGetValue(id, out var connection);
        return Task.FromResult(connection);
    }

    public Task<KafkaConnection> AddConnectionAsync(KafkaConnection connection)
    {
        _connections[connection.Id] = connection;
        return Task.FromResult(connection);
    }

    public Task<bool> UpdateConnectionAsync(KafkaConnection connection)
    {
        if (_connections.ContainsKey(connection.Id))
        {
            _connections[connection.Id] = connection;
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }

    public Task<bool> DeleteConnectionAsync(string id)
    {
        return Task.FromResult(_connections.TryRemove(id, out _));
    }

    public Task<bool> SetConnectionActiveAsync(string id, bool isActive)
    {
        if (_connections.TryGetValue(id, out var connection))
        {
            connection.IsActive = isActive;
            return Task.FromResult(true);
        }
        return Task.FromResult(false);
    }
}

