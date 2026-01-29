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
    private readonly InterviewHistoryService _historyService;
    private readonly VoiceAnalysisService _voiceService;
    private readonly ILogger<InterviewController> _logger;

    public InterviewController(
        IInterviewService interviewService,
        InterviewHistoryService historyService,
        VoiceAnalysisService voiceService,
        ILogger<InterviewController> logger)
    {
        _interviewService = interviewService;
        _historyService = historyService;
        _voiceService = voiceService;
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

            if (string.IsNullOrWhiteSpace(request.ResumeText) && request.ResumeData == null)
            {
                return BadRequest(new ProblemDetails
                {
                    Title = "Invalid Request",
                    Detail = "A resume (uploaded or pasted) must be provided"
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
    /// Save interview progress (partial or incomplete interview)
    /// </summary>
    [HttpPost("save-progress")]
    [ProducesResponseType(typeof(SaveResultResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<SaveResultResponse>> SaveProgress([FromBody] SaveProgressRequest request)
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized(new ProblemDetails
                {
                    Title = "Unauthorized",
                    Detail = "You must be logged in to save progress"
                });
            }

            // Get the session
            var session = await _interviewService.GetSessionAsync(request.SessionId);
            if (session == null)
            {
                return NotFound(new ProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Interview session not found"
                });
            }

            // Calculate current metrics
            var avgScore = session.Scores.Any() ? session.Scores.Average(s => s.Score) : 0;
            var avgConfidence = session.Scores.Any() ? session.Scores.Average(s => s.ConfidenceScore) : 0;
            var technicalScores = session.Scores.Where(s => s.QuestionNumber >= 1 && s.QuestionNumber <= 3);
            var behavioralScores = session.Scores.Where(s => s.QuestionNumber >= 4 && s.QuestionNumber <= 5);
            var technicalAvg = technicalScores.Any() ? technicalScores.Average(s => s.Score) : 0;
            var behavioralAvg = behavioralScores.Any() ? behavioralScores.Average(s => s.Score) : 0;

            // Calculate voice delivery metrics (only from voice answers)
            var voiceAnswers = session.Scores.Where(s => s.VoiceDelivery != null).ToList();
            double? avgVoiceConfidence = null;
            double? avgFillerPercentage = null;
            double? avgSpeechPace = null;
            double? avgToneScore = null;
            double? avgVocalEnergy = null;
            
            if (voiceAnswers.Any())
            {
                avgVoiceConfidence = voiceAnswers.Where(s => s.VoiceConfidence.HasValue)
                    .Average(s => s.VoiceConfidence!.Value);
                avgFillerPercentage = voiceAnswers.Average(s => s.VoiceDelivery!.FillerWordsPercentage);
                avgSpeechPace = voiceAnswers.Average(s => s.VoiceDelivery!.SpeechPaceWPM);
                avgToneScore = voiceAnswers.Average(s => s.VoiceDelivery!.ToneScore);
                avgVocalEnergy = voiceAnswers.Average(s => s.VoiceDelivery!.VocalEnergy);
            }

            // Collect strengths and improvements
            var allImprovements = session.Scores.SelectMany(s => s.Improvements).Distinct().Take(5).ToList();
            var allStrengths = session.Scores.SelectMany(s => s.Strengths ?? new List<string>()).Distinct().Take(5).ToList();

            var result = new InterviewResult
            {
                UserId = userId,
                CompletedAt = DateTime.UtcNow,
                OverallScore = avgScore,
                AverageConfidence = avgConfidence,
                TechnicalAverage = technicalAvg,
                BehavioralAverage = behavioralAvg,
                SituationalScore = 0,
                QuestionsAnswered = session.Scores.Count,
                TopStrengths = allStrengths,
                KeyWeaknesses = allImprovements,
                OverallFeedback = $"Progress saved: {session.Scores.Count} of {session.TotalQuestions} questions answered",
                // Voice delivery metrics
                AverageVoiceConfidence = avgVoiceConfidence.HasValue ? Math.Round(avgVoiceConfidence.Value, 1) : null,
                AverageFillerPercentage = avgFillerPercentage.HasValue ? Math.Round(avgFillerPercentage.Value, 1) : null,
                AverageSpeechPace = avgSpeechPace.HasValue ? Math.Round(avgSpeechPace.Value, 1) : null,
                AverageToneScore = avgToneScore.HasValue ? Math.Round(avgToneScore.Value, 2) : null,
                AverageVocalEnergy = avgVocalEnergy.HasValue ? Math.Round(avgVocalEnergy.Value, 1) : null,
                VoiceAnswersCount = voiceAnswers.Count,
                QuestionScores = session.Scores.Select(qs => new QuestionScoreData
                {
                    QuestionNumber = qs.QuestionNumber,
                    Category = qs.Category,
                    Question = qs.Question,
                    Answer = qs.Answer,
                    Score = qs.Score,
                    ConfidenceScore = qs.ConfidenceScore,
                    TechnicalAccuracy = qs.TechnicalAccuracy,
                    Clarity = qs.Clarity,
                    Depth = qs.Depth,
                    Feedback = qs.Feedback,
                    Strengths = qs.Strengths ?? new List<string>(),
                    Improvements = qs.Improvements,
                    Insights = qs.Insights
                }).ToList(),
                IsComplete = false // Mark as incomplete
            };

            var savedId = await _historyService.SaveInterviewResultAsync(result);

            // Return the full result so frontend doesn't need to recalculate
            return Ok(new SaveProgressResponse
            {
                Id = savedId,
                Message = "Interview progress saved successfully",
                Result = result
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving interview progress");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Failed to save interview progress"
            });
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

    /// <summary>
    /// Save interview result to database
    /// </summary>
    [HttpPost("save-result")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ProducesResponseType(typeof(SaveResultResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<SaveResultResponse>> SaveResult([FromBody] SaveInterviewResultRequest request)
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = new InterviewResult
            {
                UserId = userId,
                CompletedAt = DateTime.UtcNow,
                OverallScore = request.OverallScore,
                AverageConfidence = request.AverageConfidence,
                TechnicalAverage = request.TechnicalAverage,
                BehavioralAverage = request.BehavioralAverage,
                SituationalScore = request.SituationalScore,
                QuestionsAnswered = request.QuestionsAnswered,
                TopStrengths = request.TopStrengths,
                KeyWeaknesses = request.KeyWeaknesses,
                OverallFeedback = request.OverallFeedback,
                // Voice delivery metrics
                AverageVoiceConfidence = request.AverageVoiceConfidence,
                AverageFillerPercentage = request.AverageFillerPercentage,
                AverageSpeechPace = request.AverageSpeechPace,
                AverageToneScore = request.AverageToneScore,
                AverageVocalEnergy = request.AverageVocalEnergy,
                VoiceAnswersCount = request.VoiceAnswersCount,
                QuestionScores = request.QuestionScores.Select(q => new QuestionScoreData
                {
                    QuestionNumber = q.QuestionNumber,
                    Category = q.Category,
                    Question = q.Question,
                    Answer = q.Answer,
                    Score = q.Score,
                    ConfidenceScore = q.ConfidenceScore,
                    TechnicalAccuracy = q.TechnicalAccuracy,
                    Clarity = q.Clarity,
                    Depth = q.Depth,
                    Feedback = q.Feedback,
                    Strengths = q.Strengths,
                    Improvements = q.Improvements,
                    Insights = q.Insights
                }).ToList()
            };

            var id = await _historyService.SaveInterviewResultAsync(result);
            
            return Ok(new SaveResultResponse
            {
                Id = id,
                Message = "Interview result saved successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving interview result");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Failed to save interview result"
            });
        }
    }

    /// <summary>
    /// Get all saved interview results for the logged-in user
    /// </summary>
    [HttpGet("results")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ProducesResponseType(typeof(List<InterviewResult>), StatusCodes.Status200OK)]
    public async Task<ActionResult<List<InterviewResult>>> GetResults()
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var results = await _historyService.GetUserInterviewHistoryAsync(userId);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving interview results");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Failed to retrieve interview results"
            });
        }
    }

    /// <summary>
    /// Get statistics for the logged-in user
    /// </summary>
    [HttpGet("stats")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ProducesResponseType(typeof(InterviewStats), StatusCodes.Status200OK)]
    public async Task<ActionResult<InterviewStats>> GetStats()
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var stats = await _historyService.GetUserStatsAsync(userId);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user stats");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Failed to retrieve statistics"
            });
        }
    }

    /// <summary>
    /// Delete a specific interview result
    /// </summary>
    [HttpDelete("results/{id}")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteInterviewResult(string id)
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var deleted = await _historyService.DeleteInterviewAsync(id, userId);
            if (!deleted)
            {
                return NotFound(new ProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Interview result not found or you don't have permission to delete it"
                });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting interview result");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Failed to delete interview result"
            });
        }
    }

    /// <summary>
    /// Delete all interview results for the current user
    /// </summary>
    [HttpDelete("results")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    public async Task<IActionResult> DeleteAllInterviewResults()
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var count = await _historyService.DeleteAllUserInterviewsAsync(userId);
            return Ok(new { deletedCount = count, message = $"Deleted {count} interview(s)" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting all interview results");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Failed to delete interview results"
            });
        }
    }

    /// <summary>
    /// Get a specific interview result by ID
    /// </summary>
    [HttpGet("results/{id}")]
    [Microsoft.AspNetCore.Authorization.Authorize]
    [ProducesResponseType(typeof(InterviewResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<InterviewResult>> GetResultById(string id)
    {
        try
        {
            var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var result = await _historyService.GetInterviewByIdAsync(id, userId);
            if (result == null)
            {
                return NotFound(new ProblemDetails
                {
                    Title = "Not Found",
                    Detail = "Interview result not found"
                });
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving interview result");
            return StatusCode(500, new ProblemDetails
            {
                Title = "Internal Server Error",
                Detail = "Failed to retrieve interview result"
            });
        }
    }

    /// <summary>
    /// Analyze voice recording for transcription and confidence scoring
    /// </summary>
    [HttpPost("analyze-voice")]
    [ProducesResponseType(typeof(VoiceAnalysisResult), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<VoiceAnalysisResult>> AnalyzeVoice(IFormFile audio)
    {
        try
        {
            if (audio == null || audio.Length == 0)
            {
                return BadRequest(new VoiceAnalysisResult
                {
                    Success = false,
                    Error = "No audio file provided"
                });
            }

            _logger.LogInformation($"[VOICE] Received audio file: {audio.FileName}, Size: {audio.Length} bytes");

            // Process with Whisper
            await using var stream = audio.OpenReadStream();
            var result = await _voiceService.AnalyzeAudioAsync(stream, audio.FileName);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[VOICE] Error in analyze-voice endpoint");
            return Ok(new VoiceAnalysisResult
            {
                Success = false,
                Error = $"Server error: {ex.Message}"
            });
        }
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

/// <summary>
/// Request to save interview result
/// </summary>
public class SaveInterviewResultRequest
{
    public double OverallScore { get; set; }
    public double AverageConfidence { get; set; }
    public double TechnicalAverage { get; set; }
    public double BehavioralAverage { get; set; }
    public double SituationalScore { get; set; }
    public int QuestionsAnswered { get; set; }
    public List<string> TopStrengths { get; set; } = new();
    public List<string> KeyWeaknesses { get; set; } = new();
    public string OverallFeedback { get; set; } = string.Empty;
    public List<QuestionScoreRequest> QuestionScores { get; set; } = new();
    
    // Voice delivery metrics
    public double? AverageVoiceConfidence { get; set; }
    public double? AverageFillerPercentage { get; set; }
    public double? AverageSpeechPace { get; set; }
    public double? AverageToneScore { get; set; }
    public double? AverageVocalEnergy { get; set; }
    public int VoiceAnswersCount { get; set; }
}

public class QuestionScoreRequest
{
    public int QuestionNumber { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public double Score { get; set; }
    public double ConfidenceScore { get; set; }
    public double TechnicalAccuracy { get; set; }
    public double Clarity { get; set; }
    public double Depth { get; set; }
    public string Feedback { get; set; } = string.Empty;
    public List<string> Strengths { get; set; } = new();
    public List<string> Improvements { get; set; } = new();
    public List<string> Insights { get; set; } = new();
}

public class SaveResultResponse
{
    public string Id { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class SaveProgressResponse
{
    public string Id { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public required InterviewResult Result { get; set; }
}

public class SaveProgressRequest
{
    public string SessionId { get; set; } = string.Empty;
}
