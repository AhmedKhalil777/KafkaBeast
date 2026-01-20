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
                Status = "Success"
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error producing message to topic {Topic}", request.Topic);
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
}

