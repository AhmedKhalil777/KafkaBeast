namespace KafkaBeast.Dashboard.Models;

public class KafkaConnection
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string BootstrapServers { get; set; } = "localhost:9092";
    
    // Security Settings
    public SecurityProtocol SecurityProtocol { get; set; } = SecurityProtocol.Plaintext;
    
    // SASL Settings
    public SaslMechanism? SaslMechanism { get; set; }
    public string? SaslUsername { get; set; }
    public string? SaslPassword { get; set; }
    public string? SaslOauthBearerToken { get; set; }
    public string? SaslOauthBearerTokenEndpointUrl { get; set; }
    public string? SaslKerberosServiceName { get; set; }
    public string? SaslKerberosPrincipal { get; set; }
    public string? SaslKerberosKeytab { get; set; }
    
    // SSL Settings
    public string? SslCaLocation { get; set; }
    public string? SslCertificateLocation { get; set; }
    public string? SslKeyLocation { get; set; }
    public string? SslKeyPassword { get; set; }
    public string? SslCaPem { get; set; }
    public string? SslCertificatePem { get; set; }
    public string? SslKeyPem { get; set; }
    public bool SslEndpointIdentificationAlgorithm { get; set; } = true;
    
    // Schema Registry
    public string? SchemaRegistryUrl { get; set; }
    public string? SchemaRegistryUsername { get; set; }
    public string? SchemaRegistryPassword { get; set; }
    
    // Advanced Client Settings
    public int? MessageTimeoutMs { get; set; }
    public int? RequestTimeoutMs { get; set; }
    public int? SessionTimeoutMs { get; set; }
    public int? ConnectionsMaxIdleMs { get; set; }
    public int? MetadataMaxAgeMs { get; set; }
    public int? SocketTimeoutMs { get; set; }
    public int? MaxInFlight { get; set; }
    public string? ClientId { get; set; }
    public CompressionType? CompressionType { get; set; }
    public Acks? Acks { get; set; }
    public bool? EnableIdempotence { get; set; }
    
    public Dictionary<string, string>? AdditionalConfig { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; }
}

public enum SecurityProtocol
{
    Plaintext,
    Ssl,
    SaslPlaintext,
    SaslSsl
}

public enum SaslMechanism
{
    Plain,
    ScramSha256,
    ScramSha512,
    Gssapi,
    OauthBearer
}

public enum CompressionType
{
    None,
    Gzip,
    Snappy,
    Lz4,
    Zstd
}

public enum Acks
{
    None,
    Leader,
    All
}

public class ProduceMessageRequest
{
    public string ConnectionId { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string? Key { get; set; }
    public string Message { get; set; } = string.Empty;
    public Dictionary<string, string>? Headers { get; set; }
    public int? Partition { get; set; }
    
    // Serialization settings
    public SerializationType KeySerialization { get; set; } = SerializationType.String;
    public SerializationType ValueSerialization { get; set; } = SerializationType.String;
    public string? SchemaRegistryUrl { get; set; }
    public string? AvroSchema { get; set; }
    public string? ProtobufSchema { get; set; }
}

public class BatchProduceRequest
{
    public string ConnectionId { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public List<BatchMessage> Messages { get; set; } = new();
}

public class BatchMessage
{
    public string? Key { get; set; }
    public string Value { get; set; } = string.Empty;
    public Dictionary<string, string>? Headers { get; set; }
}

// Serialization Types
public enum SerializationType
{
    String,
    Json,
    Avro,
    Protobuf,
    MessagePack,
    ByteArray,
    Base64,
    Xml
}

public class SerializationConfig
{
    public SerializationType KeySerialization { get; set; } = SerializationType.String;
    public SerializationType ValueSerialization { get; set; } = SerializationType.String;
    public string? SchemaRegistryUrl { get; set; }
    public string? AvroSchema { get; set; }
    public string? ProtobufSchema { get; set; }
    public bool PrettyPrintJson { get; set; } = true;
}

public class BatchProduceResponse
{
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<BatchProduceResult> Results { get; set; } = new();
}

public class BatchProduceResult
{
    public int Index { get; set; }
    public bool Success { get; set; }
    public string? Error { get; set; }
    public int? Partition { get; set; }
    public long? Offset { get; set; }
}

public class ConsumeMessageRequest
{
    public string ConnectionId { get; set; } = string.Empty;
    public string Topic { get; set; } = string.Empty;
    public string? GroupId { get; set; }
    public bool AutoOffsetReset { get; set; } = true; // true = earliest, false = latest
    public int? Partition { get; set; }
    public long? StartOffset { get; set; }
    public DateTime? StartTimestamp { get; set; }
    
    // Serialization settings
    public SerializationType KeySerialization { get; set; } = SerializationType.String;
    public SerializationType ValueSerialization { get; set; } = SerializationType.String;
    public string? SchemaRegistryUrl { get; set; }
    public string? AvroSchema { get; set; }
    public string? ProtobufSchema { get; set; }
}

public class ConsumedMessage
{
    public string Topic { get; set; } = string.Empty;
    public string? Key { get; set; }
    public string Value { get; set; } = string.Empty;
    public string? RawKeyBase64 { get; set; }
    public string? RawValueBase64 { get; set; }
    public long Offset { get; set; }
    public int Partition { get; set; }
    public DateTime Timestamp { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
    public SerializationType KeySerializationType { get; set; }
    public SerializationType ValueSerializationType { get; set; }
    public string? DeserializationError { get; set; }
}

// Connection Test
public class ConnectionTestResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public int? BrokerCount { get; set; }
    public int? TopicCount { get; set; }
    public string? ClusterId { get; set; }
}

// Cluster Info
public class ClusterInfo
{
    public int ControllerId { get; set; }
    public List<BrokerInfo> Brokers { get; set; } = new();
    public int TopicCount { get; set; }
}

public class BrokerInfo
{
    public int BrokerId { get; set; }
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; }
}

// Topic Management
public class KafkaTopic
{
    public string Name { get; set; } = string.Empty;
    public int PartitionCount { get; set; }
    public int ReplicationFactor { get; set; }
    public string ConnectionId { get; set; } = string.Empty;
    public bool IsInternal { get; set; }
}

public class TopicDetails
{
    public string Name { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
    public int PartitionCount { get; set; }
    public int ReplicationFactor { get; set; }
    public List<PartitionInfo> Partitions { get; set; } = new();
    public Dictionary<string, string> Configurations { get; set; } = new();
}

public class PartitionInfo
{
    public int PartitionId { get; set; }
    public int Leader { get; set; }
    public List<int> Replicas { get; set; } = new();
    public List<int> Isrs { get; set; } = new();
}

public class TopicWatermarks
{
    public string TopicName { get; set; } = string.Empty;
    public List<PartitionWatermark> PartitionWatermarks { get; set; } = new();
    public long TotalMessages { get; set; }
}

public class PartitionWatermark
{
    public int Partition { get; set; }
    public long LowOffset { get; set; }
    public long HighOffset { get; set; }
    public long MessageCount { get; set; }
}

public class CreateTopicRequest
{
    public string TopicName { get; set; } = string.Empty;
    public int NumPartitions { get; set; } = 1;
    public short ReplicationFactor { get; set; } = 1;
    public Dictionary<string, string>? Configurations { get; set; }
}

// Consumer Group Management
public class ConsumerGroupInfo
{
    public string GroupId { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string ProtocolType { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
}

public class ConsumerGroupDetails
{
    public string GroupId { get; set; } = string.Empty;
    public string State { get; set; } = string.Empty;
    public string ProtocolType { get; set; } = string.Empty;
    public BrokerInfo? Coordinator { get; set; }
    public List<ConsumerGroupMember> Members { get; set; } = new();
}

public class ConsumerGroupMember
{
    public string GroupInstanceId { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string Host { get; set; } = string.Empty;
    public List<TopicPartitionAssignment> Assignment { get; set; } = new();
}

public class TopicPartitionAssignment
{
    public string Topic { get; set; } = string.Empty;
    public int Partition { get; set; }
}

public class ConsumerGroupLag
{
    public string Topic { get; set; } = string.Empty;
    public int Partition { get; set; }
    public long CurrentOffset { get; set; }
    public long EndOffset { get; set; }
    public long Lag { get; set; }
}

public class ResetOffsetsRequest
{
    public string GroupId { get; set; } = string.Empty;
    public OffsetResetType ResetType { get; set; }
    public List<TopicPartitionTarget> TopicPartitions { get; set; } = new();
    public DateTime? Timestamp { get; set; }
}

public class TopicPartitionTarget
{
    public string Topic { get; set; } = string.Empty;
    public int Partition { get; set; }
    public long? TargetOffset { get; set; }
}

public enum OffsetResetType
{
    Earliest,
    Latest,
    Specific,
    Timestamp
}

// Legacy compatibility
public class ConsumerGroup
{
    public string GroupId { get; set; } = string.Empty;
    public string ConnectionId { get; set; } = string.Empty;
    public string? State { get; set; }
    public int? Members { get; set; }
}



