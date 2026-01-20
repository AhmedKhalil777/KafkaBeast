using KafkaBeast.Dashboard.Models;
using KafkaBeast.Dashboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace KafkaBeast.Dashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConsumeController : ControllerBase
{
    private readonly KafkaConsumerService _consumerService;
    private readonly ILogger<ConsumeController> _logger;

    public ConsumeController(
        KafkaConsumerService consumerService,
        ILogger<ConsumeController> logger)
    {
        _consumerService = consumerService;
        _logger = logger;
    }

    [HttpPost("batch")]
    public async Task<ActionResult<List<ConsumedMessage>>> ConsumeBatch(
        [FromBody] ConsumeMessageRequest request,
        [FromQuery] int maxMessages = 10,
        [FromQuery] int timeoutSeconds = 5)
    {
        if (string.IsNullOrWhiteSpace(request.Topic))
        {
            return BadRequest("Topic is required");
        }

        try
        {
            var messages = await _consumerService.ConsumeMessagesAsync(
                request,
                maxMessages,
                TimeSpan.FromSeconds(timeoutSeconds));

            return Ok(messages);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error consuming messages from topic {Topic}", request.Topic);
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

