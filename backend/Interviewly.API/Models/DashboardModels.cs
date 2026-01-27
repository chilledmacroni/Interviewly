namespace Interviewly.API.Models;

/// <summary>
/// Dashboard summary with aggregated metrics
/// </summary>
public class DashboardSummary
{
    /// <summary>
    /// Average confidence score across all interviews
    /// </summary>
    public double AverageScore { get; set; }

    /// <summary>
    /// Total number of interviews completed
    /// </summary>
    public int TotalInterviews { get; set; }

    /// <summary>
    /// AI-generated summary of user's strong points
    /// </summary>
    public string StrongPoints { get; set; } = string.Empty;

    /// <summary>
    /// Recent session history
    /// </summary>
    public List<SessionHistoryItem> RecentSessions { get; set; } = new();
}

/// <summary>
/// Summary item for session history list
/// </summary>
public class SessionHistoryItem
{
    /// <summary>
    /// Session ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Interview date
    /// </summary>
    public DateTime Date { get; set; }

    /// <summary>
    /// Technology stack covered
    /// </summary>
    public string TechStack { get; set; } = string.Empty;

    /// <summary>
    /// Overall score for the session
    /// </summary>
    public double Score { get; set; }

    /// <summary>
    /// Difficulty level
    /// </summary>
    public string Difficulty { get; set; } = string.Empty;

    /// <summary>
    /// Number of questions answered
    /// </summary>
    public int QuestionsAnswered { get; set; }
}

/// <summary>
/// Detailed session view with full transcript
/// </summary>
public class SessionDetailResponse
{
    /// <summary>
    /// Session ID
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Interview date
    /// </summary>
    public DateTime Date { get; set; }

    /// <summary>
    /// Technology stack
    /// </summary>
    public string TechStack { get; set; } = string.Empty;

    /// <summary>
    /// Difficulty level
    /// </summary>
    public string Difficulty { get; set; } = string.Empty;

    /// <summary>
    /// Overall score
    /// </summary>
    public double OverallScore { get; set; }

    /// <summary>
    /// Full conversation transcript
    /// </summary>
    public List<ConversationTurn> Transcript { get; set; } = new();

    /// <summary>
    /// Individual question scores with feedback
    /// </summary>
    public List<QuestionScore> Scores { get; set; } = new();

    /// <summary>
    /// AI-generated overall feedback
    /// </summary>
    public string OverallFeedback { get; set; } = string.Empty;
}
