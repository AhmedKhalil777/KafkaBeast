using KafkaBeast.Dashboard.Data;
using KafkaBeast.Dashboard.Models;
using Microsoft.EntityFrameworkCore;
using SaslMechanism = KafkaBeast.Dashboard.Models.SaslMechanism;
using SecurityProtocol = KafkaBeast.Dashboard.Models.SecurityProtocol;

namespace KafkaBeast.Dashboard.Services;

public class KafkaConnectionService
{
    private readonly IDbContextFactory<KafkaBeastDbContext> _contextFactory;
    private readonly ILogger<KafkaConnectionService> _logger;

    public KafkaConnectionService(
        IDbContextFactory<KafkaBeastDbContext> contextFactory,
        ILogger<KafkaConnectionService> logger)
    {
        _contextFactory = contextFactory;
        _logger = logger;
    }

    public async Task<List<KafkaConnection>> GetAllConnectionsAsync()
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        return await context.Connections.OrderByDescending(c => c.CreatedAt).ToListAsync();
    }

    public async Task<KafkaConnection?> GetConnectionAsync(string id)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        return await context.Connections.FindAsync(id);
    }

    public async Task<KafkaConnection> AddConnectionAsync(KafkaConnection connection)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        // Ensure ID is set
        if (string.IsNullOrWhiteSpace(connection.Id))
        {
            connection.Id = Guid.NewGuid().ToString();
        }

        connection.CreatedAt = DateTime.UtcNow;
        
        context.Connections.Add(connection);
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Created new connection: {Name} ({Id})", connection.Name, connection.Id);
        return connection;
    }

    public async Task<bool> UpdateConnectionAsync(KafkaConnection connection)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        var existing = await context.Connections.FindAsync(connection.Id);
        if (existing == null)
        {
            return false;
        }

        context.Entry(existing).CurrentValues.SetValues(connection);
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Updated connection: {Name} ({Id})", connection.Name, connection.Id);
        return true;
    }

    public async Task<bool> DeleteConnectionAsync(string id)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        var connection = await context.Connections.FindAsync(id);
        if (connection == null)
        {
            return false;
        }

        context.Connections.Remove(connection);
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Deleted connection: {Name} ({Id})", connection.Name, id);
        return true;
    }

    public async Task<bool> SetConnectionActiveAsync(string id, bool isActive)
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        var connection = await context.Connections.FindAsync(id);
        if (connection == null)
        {
            return false;
        }

        connection.IsActive = isActive;
        await context.SaveChangesAsync();
        
        _logger.LogInformation("Set connection {Name} ({Id}) active status to {IsActive}", 
            connection.Name, id, isActive);
        return true;
    }

    /// <summary>
    /// Seeds the database with a default connection if no connections exist
    /// </summary>
    public async Task SeedDefaultConnectionIfNeededAsync()
    {
        await using var context = await _contextFactory.CreateDbContextAsync();
        
        if (!await context.Connections.AnyAsync())
        {
            var defaultConnection = new KafkaConnection
            {
                Id = Guid.NewGuid().ToString(),
                Name = "Default Connection",
                BootstrapServers = "localhost:9092",
                IsActive = true,
                ClientId = "kafka-beast-client",
                ConsumerGroupId = "kafka-beast-group",
                CreatedAt = DateTime.UtcNow
            };

            context.Connections.Add(defaultConnection);
            await context.SaveChangesAsync();
            
            _logger.LogInformation("Seeded default connection");
        }
    }
}


