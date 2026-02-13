using KafkaBeast.Dashboard.Models;
using KafkaBeast.Dashboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace KafkaBeast.Dashboard.Controllers;

[ApiController]
[Route("api/connections/{connectionId}/consumer-groups")]
public class ConsumerGroupsController : ControllerBase
{
    private readonly KafkaAdminService _adminService;
    private readonly ILogger<ConsumerGroupsController> _logger;

    public ConsumerGroupsController(
        KafkaAdminService adminService,
        ILogger<ConsumerGroupsController> logger)
    {
        _adminService = adminService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<ConsumerGroupInfo>>> GetConsumerGroups(string connectionId)
    {
        try
        {
            var groups = await _adminService.GetConsumerGroupsAsync(connectionId);
            return Ok(groups);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting consumer groups for connection {ConnectionId}", connectionId);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("{groupId}")]
    public async Task<ActionResult<ConsumerGroupDetails>> GetConsumerGroupDetails(string connectionId, string groupId)
    {
        try
        {
            var details = await _adminService.GetConsumerGroupDetailsAsync(connectionId, groupId);
            return Ok(details);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting consumer group details for {GroupId}", groupId);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("{groupId}/lag")]
    public async Task<ActionResult<List<ConsumerGroupLag>>> GetConsumerGroupLag(string connectionId, string groupId)
    {
        try
        {
            var lag = await _adminService.GetConsumerGroupLagAsync(connectionId, groupId);
            return Ok(lag);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting lag for consumer group {GroupId}", groupId);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpDelete("{groupId}")]
    public async Task<ActionResult> DeleteConsumerGroup(string connectionId, string groupId)
    {
        try
        {
            await _adminService.DeleteConsumerGroupAsync(connectionId, groupId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting consumer group {GroupId}", groupId);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("{groupId}/reset-offsets")]
    public async Task<ActionResult> ResetOffsets(string connectionId, string groupId, [FromBody] ResetOffsetsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.GroupId))
        {
            request.GroupId = groupId;
        }

        if (request.TopicPartitions == null || !request.TopicPartitions.Any())
        {
            return BadRequest(new { error = "At least one topic partition is required" });
        }

        try
        {
            await _adminService.ResetConsumerGroupOffsetsAsync(connectionId, request);
            return Ok(new { success = true, message = "Offsets reset successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting offsets for consumer group {GroupId}", groupId);
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
