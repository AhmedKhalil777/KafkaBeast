using KafkaBeast.Dashboard.Models;
using KafkaBeast.Dashboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace KafkaBeast.Dashboard.Controllers;

[ApiController]
[Route("api/connections/{connectionId}/admin")]
public class AdminController : ControllerBase
{
    private readonly KafkaAdminService _adminService;
    private readonly ILogger<AdminController> _logger;

    public AdminController(
        KafkaAdminService adminService,
        ILogger<AdminController> logger)
    {
        _adminService = adminService;
        _logger = logger;
    }

    [HttpGet("test")]
    public async Task<ActionResult<ConnectionTestResult>> TestConnection(string connectionId)
    {
        try
        {
            var result = await _adminService.TestConnectionAsync(connectionId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing connection {ConnectionId}", connectionId);
            return StatusCode(500, new ConnectionTestResult { Success = false, Message = ex.Message });
        }
    }

    [HttpGet("cluster-info")]
    public async Task<ActionResult<ClusterInfo>> GetClusterInfo(string connectionId)
    {
        try
        {
            var info = await _adminService.GetClusterInfoAsync(connectionId);
            return Ok(info);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cluster info for connection {ConnectionId}", connectionId);
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
