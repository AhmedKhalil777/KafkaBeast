using KafkaBeast.Dashboard.Models;
using KafkaBeast.Dashboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace KafkaBeast.Dashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConnectionsController : ControllerBase
{
    private readonly KafkaConnectionService _connectionService;
    private readonly ILogger<ConnectionsController> _logger;

    public ConnectionsController(
        KafkaConnectionService connectionService,
        ILogger<ConnectionsController> logger)
    {
        _connectionService = connectionService;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<KafkaConnection>>> GetAll()
    {
        var connections = await _connectionService.GetAllConnectionsAsync();
        return Ok(connections);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<KafkaConnection>> Get(string id)
    {
        var connection = await _connectionService.GetConnectionAsync(id);
        if (connection == null)
        {
            return NotFound();
        }
        return Ok(connection);
    }

    [HttpPost]
    public async Task<ActionResult<KafkaConnection>> Create([FromBody] KafkaConnection connection)
    {
        if (string.IsNullOrWhiteSpace(connection.Name) || string.IsNullOrWhiteSpace(connection.BootstrapServers))
        {
            return BadRequest("Name and BootstrapServers are required");
        }

        // Ensure ID is set
        if (string.IsNullOrWhiteSpace(connection.Id))
        {
            connection.Id = Guid.NewGuid().ToString();
        }

        var created = await _connectionService.AddConnectionAsync(connection);
        return CreatedAtAction(nameof(Get), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> Update(string id, [FromBody] KafkaConnection connection)
    {
        if (id != connection.Id)
        {
            return BadRequest("ID mismatch");
        }

        var updated = await _connectionService.UpdateConnectionAsync(connection);
        if (!updated)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> Delete(string id)
    {
        var deleted = await _connectionService.DeleteConnectionAsync(id);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }

    [HttpPatch("{id}/active")]
    public async Task<ActionResult> SetActive(string id, [FromBody] bool isActive)
    {
        var updated = await _connectionService.SetConnectionActiveAsync(id, isActive);
        if (!updated)
        {
            return NotFound();
        }

        return NoContent();
    }
}


