using KafkaBeast.Dashboard.Models;
using System.Text;
using System.Text.Json;
using System.Xml;

namespace KafkaBeast.Dashboard.Services;

public class SerializationService
{
    private readonly ILogger<SerializationService> _logger;
    private static readonly JsonSerializerOptions PrettyJsonOptions = new()
    {
        WriteIndented = true
    };
    private static readonly JsonSerializerOptions CompactJsonOptions = new()
    {
        WriteIndented = false
    };

    public SerializationService(ILogger<SerializationService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Serializes a value based on the specified serialization type
    /// </summary>
    public byte[] Serialize(string? value, SerializationType serializationType, SerializationConfig? config = null)
    {
        if (string.IsNullOrEmpty(value))
        {
            return Array.Empty<byte>();
        }

        return serializationType switch
        {
            SerializationType.String => Encoding.UTF8.GetBytes(value),
            SerializationType.Json => SerializeJson(value),
            SerializationType.Xml => SerializeXml(value),
            SerializationType.Avro => SerializeAvro(value, config?.AvroSchema),
            SerializationType.Protobuf => SerializeProtobuf(value, config?.ProtobufSchema),
            SerializationType.MessagePack => SerializeMessagePack(value),
            SerializationType.ByteArray => Encoding.UTF8.GetBytes(value),
            SerializationType.Base64 => Convert.FromBase64String(value),
            _ => Encoding.UTF8.GetBytes(value)
        };
    }

    /// <summary>
    /// Deserializes bytes based on the specified serialization type
    /// </summary>
    public (string? Value, string? Error) Deserialize(byte[]? data, SerializationType serializationType, SerializationConfig? config = null)
    {
        if (data == null || data.Length == 0)
        {
            return (null, null);
        }

        try
        {
            var result = serializationType switch
            {
                SerializationType.String => Encoding.UTF8.GetString(data),
                SerializationType.Json => DeserializeJson(data, config?.PrettyPrintJson ?? true),
                SerializationType.Xml => DeserializeXml(data, config?.PrettyPrintJson ?? true),
                SerializationType.Avro => DeserializeAvro(data, config?.AvroSchema),
                SerializationType.Protobuf => DeserializeProtobuf(data, config?.ProtobufSchema),
                SerializationType.MessagePack => DeserializeMessagePack(data),
                SerializationType.ByteArray => BitConverter.ToString(data).Replace("-", " "),
                SerializationType.Base64 => Convert.ToBase64String(data),
                _ => Encoding.UTF8.GetString(data)
            };
            return (result, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize with {Type}, falling back to string", serializationType);
            // Return both the fallback value and the error
            return (Encoding.UTF8.GetString(data), ex.Message);
        }
    }

    /// <summary>
    /// Auto-detects the most likely serialization type based on the data
    /// </summary>
    public SerializationType DetectSerializationType(byte[]? data)
    {
        if (data == null || data.Length == 0)
        {
            return SerializationType.String;
        }

        // Check for JSON (starts with { or [)
        if (data.Length > 0 && (data[0] == '{' || data[0] == '['))
        {
            try
            {
                using var doc = JsonDocument.Parse(data);
                return SerializationType.Json;
            }
            catch
            {
                // Not valid JSON
            }
        }

        // Check for XML (starts with < or <?xml)
        if (data.Length > 0 && data[0] == '<')
        {
            try
            {
                var xmlString = Encoding.UTF8.GetString(data);
                var doc = new XmlDocument();
                doc.LoadXml(xmlString);
                return SerializationType.Xml;
            }
            catch
            {
                // Not valid XML
            }
        }

        // Check for Avro magic bytes (C3 01)
        if (data.Length >= 5 && data[0] == 0x00)
        {
            // Could be Confluent Schema Registry format (magic byte + 4 byte schema ID)
            return SerializationType.Avro;
        }

        // Check if it's valid UTF-8 text
        try
        {
            var text = Encoding.UTF8.GetString(data);
            // Check if it's printable
            if (text.All(c => !char.IsControl(c) || char.IsWhiteSpace(c)))
            {
                return SerializationType.String;
            }
        }
        catch
        {
            // Not valid UTF-8
        }

        // Default to byte array for binary data
        return SerializationType.ByteArray;
    }

    private byte[] SerializeJson(string value)
    {
        try
        {
            // Parse and re-serialize to ensure valid JSON
            using var doc = JsonDocument.Parse(value);
            return JsonSerializer.SerializeToUtf8Bytes(doc.RootElement, CompactJsonOptions);
        }
        catch
        {
            // If not valid JSON, serialize the string as a JSON string
            return JsonSerializer.SerializeToUtf8Bytes(value);
        }
    }

    private string DeserializeJson(byte[] data, bool prettyPrint)
    {
        using var doc = JsonDocument.Parse(data);
        return JsonSerializer.Serialize(doc.RootElement, prettyPrint ? PrettyJsonOptions : CompactJsonOptions);
    }

    private byte[] SerializeXml(string value)
    {
        try
        {
            // Parse and re-serialize to ensure valid XML
            var doc = new System.Xml.XmlDocument();
            doc.LoadXml(value);
            return Encoding.UTF8.GetBytes(doc.OuterXml);
        }
        catch
        {
            // If not valid XML, just return as UTF-8 bytes
            return Encoding.UTF8.GetBytes(value);
        }
    }

    private string DeserializeXml(byte[] data, bool prettyPrint)
    {
        var xmlString = Encoding.UTF8.GetString(data);
        
        if (!prettyPrint)
        {
            return xmlString;
        }

        try
        {
            var doc = new System.Xml.XmlDocument();
            doc.LoadXml(xmlString);
            
            using var stringWriter = new System.IO.StringWriter();
            using var xmlWriter = new System.Xml.XmlTextWriter(stringWriter);
            xmlWriter.Formatting = System.Xml.Formatting.Indented;
            xmlWriter.Indentation = 2;
            doc.WriteTo(xmlWriter);
            return stringWriter.ToString();
        }
        catch
        {
            return xmlString;
        }
    }

    private byte[] SerializeAvro(string value, string? schema)
    {
        // For Avro serialization without Schema Registry, we need the schema
        // In a production environment, you would use Confluent.SchemaRegistry.Serdes.Avro
        // For now, we'll treat it as JSON that would be serialized to Avro
        
        if (string.IsNullOrEmpty(schema))
        {
            _logger.LogWarning("Avro schema not provided, treating as JSON");
            return SerializeJson(value);
        }

        // In production, you would:
        // 1. Parse the Avro schema
        // 2. Create an Avro GenericRecord or specific record
        // 3. Serialize using AvroSerializer
        // For demonstration, we'll use JSON as a placeholder
        _logger.LogInformation("Avro serialization requested - using JSON as placeholder. For full Avro support, configure Schema Registry.");
        return SerializeJson(value);
    }

    private string DeserializeAvro(byte[] data, string? schema)
    {
        // Check for Confluent Schema Registry wire format
        if (data.Length >= 5 && data[0] == 0x00)
        {
            var schemaId = BitConverter.ToInt32(data.Skip(1).Take(4).Reverse().ToArray(), 0);
            var payload = data.Skip(5).ToArray();
            
            // In production, you would:
            // 1. Fetch schema from Schema Registry using schemaId
            // 2. Deserialize using AvroDeserializer
            _logger.LogInformation("Detected Confluent wire format with Schema ID: {SchemaId}", schemaId);
            
            // Try to parse the payload as JSON (common for debugging)
            try
            {
                return DeserializeJson(payload, true);
            }
            catch
            {
                return $"[Avro: SchemaId={schemaId}, Payload={Convert.ToBase64String(payload)}]";
            }
        }

        // Try JSON as fallback
        try
        {
            return DeserializeJson(data, true);
        }
        catch
        {
            return Convert.ToBase64String(data);
        }
    }

    private byte[] SerializeProtobuf(string value, string? schema)
    {
        // For Protobuf, you would typically:
        // 1. Compile the .proto schema
        // 2. Generate C# classes or use reflection
        // 3. Deserialize JSON to the Protobuf type
        // 4. Serialize to binary
        
        if (string.IsNullOrEmpty(schema))
        {
            _logger.LogWarning("Protobuf schema not provided, treating as JSON");
            return SerializeJson(value);
        }

        _logger.LogInformation("Protobuf serialization requested - using JSON as placeholder. For full Protobuf support, provide compiled descriptors.");
        return SerializeJson(value);
    }

    private string DeserializeProtobuf(byte[] data, string? schema)
    {
        // Check for Confluent Schema Registry wire format for Protobuf
        if (data.Length >= 6 && data[0] == 0x00)
        {
            var schemaId = BitConverter.ToInt32(data.Skip(1).Take(4).Reverse().ToArray(), 0);
            // Protobuf messages have additional index bytes after schema ID
            
            _logger.LogInformation("Detected Confluent Protobuf wire format with Schema ID: {SchemaId}", schemaId);
        }

        // Without schema, show as hex dump
        return $"[Protobuf: {BitConverter.ToString(data).Replace("-", " ")}]";
    }

    private byte[] SerializeMessagePack(string value)
    {
        // MessagePack requires the MessagePack-CSharp library
        // For demonstration, we'll convert JSON to a compact binary representation
        try
        {
            using var doc = JsonDocument.Parse(value);
            // In production, use MessagePackSerializer.Serialize
            _logger.LogInformation("MessagePack serialization requested - using JSON as placeholder. Add MessagePack-CSharp for full support.");
            return SerializeJson(value);
        }
        catch
        {
            return Encoding.UTF8.GetBytes(value);
        }
    }

    private string DeserializeMessagePack(byte[] data)
    {
        // In production, use MessagePackSerializer.Deserialize
        // For now, try to interpret as JSON or show hex
        try
        {
            return DeserializeJson(data, true);
        }
        catch
        {
            return $"[MessagePack: {BitConverter.ToString(data).Replace("-", " ")}]";
        }
    }

    /// <summary>
    /// Gets a friendly display name for the serialization type
    /// </summary>
    public static string GetDisplayName(SerializationType type) => type switch
    {
        SerializationType.String => "Plain Text (UTF-8)",
        SerializationType.Json => "JSON",
        SerializationType.Avro => "Apache Avro",
        SerializationType.Protobuf => "Protocol Buffers",
        SerializationType.MessagePack => "MessagePack",
        SerializationType.ByteArray => "Byte Array (Hex)",
        SerializationType.Base64 => "Base64",
        _ => type.ToString()
    };

    /// <summary>
    /// Gets all available serialization types with metadata
    /// </summary>
    public static List<SerializationTypeInfo> GetAvailableTypes()
    {
        return new List<SerializationTypeInfo>
        {
            new() { Type = SerializationType.String, Name = "String", Description = "Plain text UTF-8 encoding", RequiresSchema = false },
            new() { Type = SerializationType.Json, Name = "JSON", Description = "JSON format with optional pretty printing", RequiresSchema = false },
            new() { Type = SerializationType.Avro, Name = "Avro", Description = "Apache Avro binary format", RequiresSchema = true },
            new() { Type = SerializationType.Protobuf, Name = "Protobuf", Description = "Google Protocol Buffers", RequiresSchema = true },
            new() { Type = SerializationType.MessagePack, Name = "MessagePack", Description = "Efficient binary serialization", RequiresSchema = false },
            new() { Type = SerializationType.ByteArray, Name = "Bytes", Description = "Raw bytes displayed as hex", RequiresSchema = false },
            new() { Type = SerializationType.Base64, Name = "Base64", Description = "Base64 encoded binary data", RequiresSchema = false }
        };
    }
}

public class SerializationTypeInfo
{
    public SerializationType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool RequiresSchema { get; set; }
}
