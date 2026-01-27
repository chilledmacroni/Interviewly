using System.Text.Json.Serialization;

namespace Interviewly.API.Models;

/// <summary>
/// Request model for starting a new interview session
/// </summary>
public class StartInterviewRequest
{
    /// <summary>
    /// Technology stack for the interview (e.g., "React, Node.js, TypeScript")
    /// </summary>
    public required string TechStack { get; set; }

    /// <summary>
    /// Difficulty level: "easy", "medium", "hard"
    /// </summary>
    public required string Difficulty { get; set; }

    /// <summary>
    /// Resume text content (optional - either resumeText or jdUrl must be provided)
    /// </summary>
    public string? ResumeText { get; set; }

    /// <summary>
    /// Job description URL to scrape (optional - either resumeText or jdUrl must be provided)
    /// </summary>
    public string? JdUrl { get; set; }

    /// <summary>
    /// Job description text content (fallback if URL scraping fails)
    /// </summary>
    public string? JdText { get; set; }

    /// <summary>
    /// Structured resume data (optional)
    /// </summary>
    public ResumeExtractionResult? ResumeData { get; set; }

    /// <summary>
    /// Structured JD data (optional)
    /// </summary>
    public JdExtractionResult? JdData { get; set; }
}

/// <summary>
/// Request model for submitting an interview answer
/// </summary>
public class SubmitAnswerRequest
{
    /// <summary>
    /// The interview session ID
    /// </summary>
    public required string SessionId { get; set; }

    /// <summary>
    /// The user's answer text
    /// </summary>
    public required string Answer { get; set; }
}

/// <summary>
/// Response model for interview operations
/// </summary>
public class InterviewResponse
{
    /// <summary>
    /// The current question being asked
    /// </summary>
    public string? Question { get; set; }

    /// <summary>
    /// The interview session ID
    /// </summary>
    public string? SessionId { get; set; }

    /// <summary>
    /// Current question number (1-indexed)
    /// </summary>
    public int QuestionNumber { get; set; }

    /// <summary>
    /// Total questions in the interview
    /// </summary>
    public int TotalQuestions { get; set; }

    /// <summary>
    /// Whether the interview is complete
    /// </summary>
    public bool IsComplete { get; set; }

    /// <summary>
    /// Final score summary (only when IsComplete is true)
    /// </summary>
    public InterviewSummary? Summary { get; set; }
}

/// <summary>
/// Score result after evaluating an answer
/// </summary>
public class ScoreResult
{
    /// <summary>
    /// Confidence score from 0-10
    /// </summary>
    public int Score { get; set; }

    /// <summary>
    /// Detailed feedback on the answer
    /// </summary>
    public string Feedback { get; set; } = string.Empty;

    /// <summary>
    /// Key strengths identified
    /// </summary>
    public List<string> Strengths { get; set; } = new();

    /// <summary>
    /// Areas for improvement
    /// </summary>
    public List<string> Improvements { get; set; } = new();
}

/// <summary>
/// Interview summary after completion
/// </summary>
public class InterviewSummary
{
    /// <summary>
    /// Overall performance score (average)
    /// </summary>
    public double OverallScore { get; set; }

    /// <summary>
    /// Total questions answered
    /// </summary>
    public int QuestionsAnswered { get; set; }

    /// <summary>
    /// Individual question scores
    /// </summary>
    public List<QuestionScore> QuestionScores { get; set; } = new();

    /// <summary>
    /// Overall feedback and recommendations
    /// </summary>
    public string OverallFeedback { get; set; } = string.Empty;
}

/// <summary>
/// Score for an individual question
/// </summary>
public class QuestionScore
{
    public int QuestionNumber { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int Score { get; set; }
    public string Feedback { get; set; } = string.Empty;
}

public class ResumeExtractionResult
{
    public string Text { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? Error { get; set; }
    
    [JsonPropertyName("skills")]
    public List<string> Skills { get; set; } = new();
    
    [JsonPropertyName("projects")]
    public List<string> Projects { get; set; } = new();
}

public class JdExtractionResult
{
    public string Content { get; set; } = string.Empty;
    public string? Title { get; set; }
    public bool Success { get; set; }
    public string? Error { get; set; }
    
    [JsonPropertyName("company_values")]
    public List<string> CompanyValues { get; set; } = new();
    
    [JsonPropertyName("required_skills")]
    public List<string> RequiredSkills { get; set; } = new();
    
    [JsonPropertyName("responsibilities")]
    public List<string> Responsibilities { get; set; } = new();
}
