using System.Threading;
using KafkaBeast.Dashboard.Models;
using KafkaBeast.Dashboard.Services;
using Microsoft.AspNetCore.Mvc;

namespace KafkaBeast.Dashboard.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ConsumeController : ControllerBase
{
    private readonly ILogger<ConsumeController> _logger;

    public ConsumeController(ILogger<ConsumeController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Real-time message consumption is handled exclusively through SignalR at /hubs/kafka
    /// Use the SignalR hub methods:
    /// - StartConsuming(ConsumeMessageRequest) - Start streaming messages
    /// - StopConsuming(connectionId, topic) - Stop consumption
    /// </summary>
    [HttpGet("info")]
    public ActionResult<object> GetConsumptionInfo()
    {
        return Ok(new
        {
            message = "Message consumption is handled exclusively through SignalR",
            hubUrl = "/hubs/kafka",
            methods = new[]
            {
                "StartConsuming(ConsumeMessageRequest) - Start real-time message streaming",
                "StopConsuming(connectionId, topic) - Stop consumption"
            },
            events = new[]
            {
                "MessageReceived - Fired when a message is consumed",
                "Error - Fired when an error occurs"
            }
        });
    }
}

