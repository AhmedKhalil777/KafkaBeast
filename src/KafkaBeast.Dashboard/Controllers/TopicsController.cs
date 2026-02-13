using KafkaBeast.Dashboard.Models;
using KafkaBeast.Dashboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace KafkaBeast.Dashboard.Controllers;

[ApiController]
[Route("api/connections/{connectionId}/topics")]
public class TopicsController : ControllerBase
{
    private readonly KafkaAdminService _adminService;
    private readonly ILogger<TopicsController> _logger;

    public TopicsController(
        KafkaAdminService adminService,
        ILogger<TopicsController> logger)
    {
        _adminService = adminService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<KafkaTopic>>> GetTopics(string connectionId)
    {
        try
        {
            var topics = await _adminService.GetTopicsAsync(connectionId);
            return Ok(topics);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting topics for connection {ConnectionId}", connectionId);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("{topicName}")]
    public async Task<ActionResult<TopicDetails>> GetTopicDetails(string connectionId, string topicName)
    {
        try
        {
            var details = await _adminService.GetTopicDetailsAsync(connectionId, topicName);
            return Ok(details);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting topic details for {TopicName}", topicName);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("{topicName}/watermarks")]
    public async Task<ActionResult<TopicWatermarks>> GetTopicWatermarks(string connectionId, string topicName)
    {
        try
        {
            var watermarks = await _adminService.GetTopicWatermarksAsync(connectionId, topicName);
            return Ok(watermarks);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting watermarks for topic {TopicName}", topicName);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost]
    public async Task<ActionResult> CreateTopic(string connectionId, [FromBody] CreateTopicRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TopicName))
        {
            return BadRequest(new { error = "Topic name is required" });
        }

        try
        {
            await _adminService.CreateTopicAsync(connectionId, request);
            return CreatedAtAction(nameof(GetTopicDetails), new { connectionId, topicName = request.TopicName }, new { success = true });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating topic {TopicName}", request.TopicName);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpDelete("{topicName}")]
    public async Task<ActionResult> DeleteTopic(string connectionId, string topicName)
    {
        try
        {
            await _adminService.DeleteTopicAsync(connectionId, topicName);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting topic {TopicName}", topicName);
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
