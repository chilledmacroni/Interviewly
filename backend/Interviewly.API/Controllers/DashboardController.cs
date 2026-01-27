using Interviewly.API.Models;
using Interviewly.API.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Interviewly.API.Controllers;

/// <summary>
/// Controller for user dashboard and analytics
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IDashboardService _dashboardService;
    private readonly ILogger<DashboardController> _logger;

    public DashboardController(
        IDashboardService dashboardService,
        ILogger<DashboardController> logger)
    {
        _dashboardService = dashboardService;
        _logger = logger;
    }

    /// <summary>
    /// Get dashboard summary with aggregated metrics
    /// </summary>
    /// <returns>Dashboard summary including average score, strong points, and recent sessions</returns>
    [HttpGet("summary")]
    [ProducesResponseType(typeof(DashboardSummary), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<DashboardSummary>> GetDashboardSummary()
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var summary = await _dashboardService.GetDashboardSummaryAsync(userId);
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard summary");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while retrieving dashboard data"
            });
        }
    }

    /// <summary>
    /// Get session history for the logged-in user
    /// </summary>
    /// <param name="limit">Maximum number of sessions to return (default: 10)</param>
    /// <returns>List of session history items</returns>
    [HttpGet("sessions")]
    [ProducesResponseType(typeof(List<SessionHistoryItem>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<List<SessionHistoryItem>>> GetSessionHistory([FromQuery] int limit = 10)
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var sessions = await _dashboardService.GetSessionHistoryAsync(userId, limit);
            return Ok(sessions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting session history");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while retrieving session history"
            });
        }
    }

    /// <summary>
    /// Get detailed view of a specific session
    /// </summary>
    /// <param name="id">Session ID</param>
    /// <returns>Full session details with transcript and feedback</returns>
    [HttpGet("sessions/{id}")]
    [ProducesResponseType(typeof(SessionDetailResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<SessionDetailResponse>> GetSessionDetail(string id)
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var sessionDetail = await _dashboardService.GetSessionDetailAsync(id, userId);
            if (sessionDetail == null)
            {
                return NotFound(new ProblemDetails
                {
                    Title = "Not Found",
                    Detail = $"Session {id} not found or you don't have access to it"
                });
            }

            return Ok(sessionDetail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting session detail for session {SessionId}", id);
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An error occurred while retrieving session details"
            });
        }
    }
}
