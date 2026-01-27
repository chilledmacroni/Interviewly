using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Interviewly.API.Models;

/// <summary>
/// Represents an interview session stored in MongoDB
/// </summary>
public class InterviewSession
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string Id { get; set; } = ObjectId.GenerateNewId().ToString();

    public string? UserId { get; set; }
    public int? OverallScore { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    public string TechStack { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string? ResumeText { get; set; }
    public string? JdContent { get; set; }

    public ResumeExtractionResult? ResumeData { get; set; }
    public JdExtractionResult? JdData { get; set; }

    public List<ConversationTurn> Conversation { get; set; } = new();
    public List<QuestionScore> Scores { get; set; } = new();

    public int CurrentQuestionIndex { get; set; } = 0;
    public int TotalQuestions { get; set; } = 5;
    public bool IsComplete { get; set; } = false;

    public string Status { get; set; } = "active"; // active, completed, abandoned
}

/// <summary>
/// A single turn in the conversation (question or answer)
/// </summary>
public class ConversationTurn
{
    public string Role { get; set; } = string.Empty; // "interviewer" or "candidate"
    public string Content { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public int? Score { get; set; } // Only for candidate turns, set after scoring
}
