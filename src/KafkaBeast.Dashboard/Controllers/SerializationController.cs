using KafkaBeast.Dashboard.Models;
using KafkaBeast.Dashboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace KafkaBeast.Dashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SerializationController : ControllerBase
{
    private readonly SerializationService _serializationService;
    private readonly ILogger<SerializationController> _logger;

    public SerializationController(
        SerializationService serializationService,
        ILogger<SerializationController> logger)
    {
        _serializationService = serializationService;
        _logger = logger;
    }

    /// <summary>
    /// Get all available serialization types
    /// </summary>
    [HttpGet("types")]
    public ActionResult<IEnumerable<SerializationTypeInfo>> GetSerializationTypes()
    {
        var types = SerializationService.GetAvailableTypes()
            .Select(t => new SerializationTypeInfo
            {
                Type = t.Type,
                Name = t.Name,
                Description = GetSerializationDescription(t.Type),
                RequiresSchema = RequiresSchema(t.Type),
                IsSchemaRegistryBased = IsSchemaRegistryBased(t.Type)
            });

        return Ok(types);
    }

    /// <summary>
    /// Detect serialization type from raw data
    /// </summary>
    [HttpPost("detect")]
    public ActionResult<SerializationType> DetectSerializationType([FromBody] DetectSerializationRequest request)
    {
        if (string.IsNullOrEmpty(request.Data))
        {
            return BadRequest("Data is required");
        }

        try
        {
            byte[] bytes;
            if (request.IsBase64)
            {
                bytes = Convert.FromBase64String(request.Data);
            }
            else
            {
                bytes = System.Text.Encoding.UTF8.GetBytes(request.Data);
            }

            var detectedType = _serializationService.DetectSerializationType(bytes);
            return Ok(new { type = detectedType, name = detectedType.ToString() });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detecting serialization type");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>
    /// Validate and preview serialization
    /// </summary>
    [HttpPost("preview")]
    public ActionResult<SerializationPreview> PreviewSerialization([FromBody] SerializationPreviewRequest request)
    {
        if (string.IsNullOrEmpty(request.Data))
        {
            return BadRequest("Data is required");
        }

        try
        {
            var config = new SerializationConfig
            {
                AvroSchema = request.AvroSchema,
                ProtobufSchema = request.ProtobufSchema
            };

            // Try to serialize
            var serialized = _serializationService.Serialize(request.Data, request.SerializationType, config);
            var serializedBase64 = Convert.ToBase64String(serialized);
            var serializedHex = BitConverter.ToString(serialized).Replace("-", " ");

            // Try to deserialize back
            var deserializeResult = _serializationService.Deserialize(serialized, request.SerializationType, config);

            return Ok(new SerializationPreview
            {
                Success = true,
                SerializedSize = serialized.Length,
                SerializedBase64 = serializedBase64,
                SerializedHex = serializedHex.Length > 200 ? serializedHex.Substring(0, 200) + "..." : serializedHex,
                DeserializedValue = deserializeResult.Value,
                SerializationType = request.SerializationType.ToString()
            });
        }
        catch (Exception ex)
        {
            return Ok(new SerializationPreview
            {
                Success = false,
                Error = ex.Message,
                SerializationType = request.SerializationType.ToString()
            });
        }
    }

    private static string GetSerializationDescription(SerializationType type)
    {
        return type switch
        {
            SerializationType.String => "Plain UTF-8 text encoding",
            SerializationType.Json => "JSON format with validation",
            SerializationType.Avro => "Apache Avro binary format (requires schema)",
            SerializationType.Protobuf => "Protocol Buffers binary format (requires schema)",
            SerializationType.MessagePack => "MessagePack binary format (efficient JSON alternative)",
            SerializationType.ByteArray => "Raw binary data (no transformation)",
            SerializationType.Base64 => "Base64 encoded binary data",
            _ => "Unknown serialization type"
        };
    }

    private static bool RequiresSchema(SerializationType type)
    {
        return type == SerializationType.Avro || type == SerializationType.Protobuf;
    }

    private static bool IsSchemaRegistryBased(SerializationType type)
    {
        return type == SerializationType.Avro || type == SerializationType.Protobuf;
    }
}

public class SerializationTypeInfo
{
    public SerializationType Type { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool RequiresSchema { get; set; }
    public bool IsSchemaRegistryBased { get; set; }
}

public class DetectSerializationRequest
{
    public string Data { get; set; } = string.Empty;
    public bool IsBase64 { get; set; }
}

public class SerializationPreviewRequest
{
    public string Data { get; set; } = string.Empty;
    public SerializationType SerializationType { get; set; } = SerializationType.String;
    public string? AvroSchema { get; set; }
    public string? ProtobufSchema { get; set; }
}

public class SerializationPreview
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public int SerializedSize { get; set; }
    public string SerializedBase64 { get; set; } = string.Empty;
    public string SerializedHex { get; set; } = string.Empty;
    public string DeserializedValue { get; set; } = string.Empty;
    public string SerializationType { get; set; } = string.Empty;
}
