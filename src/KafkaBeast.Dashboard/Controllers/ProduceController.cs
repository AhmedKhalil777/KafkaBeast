using KafkaBeast.Dashboard.Models;
using KafkaBeast.Dashboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace KafkaBeast.Dashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ProduceController : ControllerBase
{
    private readonly KafkaProducerService _producerService;
    private readonly ILogger<ProduceController> _logger;

    public ProduceController(
        KafkaProducerService producerService,
        ILogger<ProduceController> logger)
    {
        _producerService = producerService;
        _logger = logger;
    }

    [HttpPost]
    public async Task<ActionResult<ProduceMessageResponse>> Produce([FromBody] ProduceMessageRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Topic) || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest("Topic and Message are required");
        }

        try
        {
            var result = await _producerService.ProduceMessageAsync(request);
            var response = new ProduceMessageResponse
            {
                Topic = result.Topic,
                Partition = result.Partition,
                Offset = result.Offset,
                Status = "Success",
                KeySerialization = result.KeySerialization.ToString(),
                ValueSerialization = result.ValueSerialization.ToString()
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error producing message to topic {Topic}", request.Topic);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("batch")]
    public async Task<ActionResult<BatchProduceResponse>> ProduceBatch([FromBody] BatchProduceRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Topic))
        {
            return BadRequest("Topic is required");
        }

        if (request.Messages == null || !request.Messages.Any())
        {
            return BadRequest("At least one message is required");
        }

        try
        {
            var response = await _producerService.ProduceBatchAsync(request);
            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error batch producing messages to topic {Topic}", request.Topic);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("{connectionId}/flush")]
    public ActionResult Flush(string connectionId, [FromQuery] int timeoutSeconds = 30)
    {
        try
        {
            _producerService.FlushProducer(connectionId, TimeSpan.FromSeconds(timeoutSeconds));
            return Ok(new { success = true, message = "Producer flushed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error flushing producer for connection {ConnectionId}", connectionId);
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public class ProduceMessageResponse
{
    public string Topic { get; set; } = string.Empty;
    public int Partition { get; set; }
    public long Offset { get; set; }
    public string Status { get; set; } = string.Empty;
    public string KeySerialization { get; set; } = string.Empty;
    public string ValueSerialization { get; set; } = string.Empty;
}


