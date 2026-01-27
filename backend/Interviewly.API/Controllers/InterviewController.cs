using Interviewly.API.Models;
using Interviewly.API.Services;
using Microsoft.AspNetCore.Mvc;

namespace Interviewly.API.Controllers;

/// <summary>
/// Controller for managing interview sessions
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class InterviewController : ControllerBase
{
    private readonly IInterviewService _interviewService;
    private readonly ILogger<InterviewController> _logger;

    public InterviewController(
        IInterviewService interviewService,
        ILogger<InterviewController> logger)
    {
        _interviewService = interviewService;
        _logger = logger;
    }

    /// <summary>
    /// Start a new interview session
    /// </summary>
    /// <param name="request">Interview configuration with tech stack, difficulty, and resume/JD</param>
    /// <returns>First interview question and session ID</returns>
    [HttpPost("start")]
    [ProducesResponseType(typeof(InterviewResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<InterviewResponse>> StartInterview([FromBody] StartInterviewRequest request)
    {
        try
        {
            // Validate request
            if (string.IsNullOrWhiteSpace(request.TechStack))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Invalid Request",
                    Detail = "TechStack is required"
                });
            }

            if (string.IsNullOrWhiteSpace(request.Difficulty))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Invalid Request",
                    Detail = "Difficulty is required (easy, medium, hard)"
                });
            }

            if (string.IsNullOrWhiteSpace(request.ResumeText) && string.IsNullOrWhiteSpace(request.JdUrl))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Invalid Request",
                    Detail = "Either resumeText or jdUrl must be provided"
                });
            }

            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            var response = await _interviewService.StartInterviewAsync(request, userId);
            
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid Request",
                Detail = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Service error starting interview");
            return StatusCode(503, new ProblemDetails
            {
                Title = "Service Unavailable",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting interview");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An unexpected error occurred"
            });
        }
    }

    /// <summary>
    /// Submit an answer and get the next question with scoring
    /// </summary>
    /// <param name="request">Session ID and answer text</param>
    /// <returns>Score for the answer and next question (or summary if complete)</returns>
    [HttpPost("answer")]
    [ProducesResponseType(typeof(AnswerResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<AnswerResponse>> SubmitAnswer([FromBody] SubmitAnswerRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.SessionId))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Invalid Request",
                    Detail = "SessionId is required"
                });
            }

            if (string.IsNullOrWhiteSpace(request.Answer))
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Invalid Request",
                    Detail = "Answer is required"
                });
            }

            var (response, score) = await _interviewService.SubmitAnswerAsync(request);

            return Ok(new AnswerResponse
            {
                InterviewResponse = response,
                Score = score
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Not Found",
                Detail = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new ProblemDetails
            {
                Title = "Invalid Operation",
                Detail = ex.Message
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting answer");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "An unexpected error occurred"
            });
        }
    }

    /// <summary>
    /// Stream a response from the AI (Server-Sent Events)
    /// </summary>
    [HttpGet("stream/{sessionId}")]
    public async Task StreamResponse(string sessionId, [FromQuery] string prompt)
    {
        Response.Headers.Append("Content-Type", "text/event-stream");
        Response.Headers.Append("Cache-Control", "no-cache");
        Response.Headers.Append("Connection", "keep-alive");

        try
        {
            await foreach (var chunk in _interviewService.StreamResponseAsync(sessionId, prompt))
            {
                var data = $"data: {chunk.Replace("\n", "\\n")}\n\n";
                await Response.WriteAsync(data);
                await Response.Body.FlushAsync();
            }

            await Response.WriteAsync("data: [DONE]\n\n");
            await Response.Body.FlushAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error streaming response");
            await Response.WriteAsync($"data: [ERROR] {ex.Message}\n\n");
        }
    }

    /// <summary>
    /// Get current session state
    /// </summary>
    [HttpGet("session/{sessionId}")]
    [ProducesResponseType(typeof(InterviewSession), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InterviewSession>> GetSession(string sessionId)
    {
        var session = await _interviewService.GetSessionAsync(sessionId);
        if (session == null)
        {
            return NotFound(new ProblemDetails
            {
                Title = "Not Found",
                Detail = $"Session {sessionId} not found"
            });
        }
        return Ok(session);
    }

    /// <summary>
    /// Get history of past interviews for the logged-in user
    /// </summary>
    [HttpGet("history")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ProducesResponseType(typeof(List<InterviewSession>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<InterviewSession>>> GetHistory()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userId))
        {
            return Unauthorized();
        }

        var history = await _interviewService.GetHistoryAsync(userId);
        return Ok(history);
    }
}

/// <summary>
/// Combined response for answer submission
/// </summary>
public class AnswerResponse
{
    public InterviewResponse InterviewResponse { get; set; } = new();
    public ScoreResult Score { get; set; } = new();
}
