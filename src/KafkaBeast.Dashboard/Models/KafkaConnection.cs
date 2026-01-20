namespace KafkaBeast.Dashboard.Models;

public class KafkaConnection
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string BootstrapServers { get; set; } = "localhost:9092";
    public Dictionary<string, string>? AdditionalConfig { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; }
}

public class ProduceMessageRequest
{
    public string ConnectionId { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string? Key { get; set; }
    public string Message { get; set; } = string.Empty;
    public Dictionary<string, string>? Headers { get; set; }
}

public class ConsumeMessageRequest
{
    public string ConnectionId { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string? GroupId { get; set; }
    public bool AutoOffsetReset { get; set; } = true; // true = earliest, false = latest
}

public class ConsumedMessage
{
    public string Topic { get; set; } = string.Empty;
    public string? Key { get; set; }
    public string Value { get; set; } = string.Empty;
    public long Offset { get; set; }
    public int Partition { get; set; }
    public DateTime Timestamp { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
}

