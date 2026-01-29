using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace Interviewly.API.Models;

public class InterviewResult
{
    [BsonId]
    [BsonRepresentation(BsonType.ObjectId)]
    public string? Id { get; set; }

    [BsonElement("userId")]
    public required string UserId { get; set; }

    [BsonElement("completedAt")]
    public DateTime CompletedAt { get; set; } = DateTime.UtcNow;

    [BsonElement("overallScore")]
    public double OverallScore { get; set; }

    [BsonElement("averageConfidence")]
    public double AverageConfidence { get; set; }

    [BsonElement("technicalAverage")]
    public double TechnicalAverage { get; set; }

    [BsonElement("behavioralAverage")]
    public double BehavioralAverage { get; set; }

    [BsonElement("situationalScore")]
    public double SituationalScore { get; set; }

    [BsonElement("questionsAnswered")]
    public int QuestionsAnswered { get; set; }

    [BsonElement("topStrengths")]
    public List<string> TopStrengths { get; set; } = new();

    [BsonElement("keyWeaknesses")]
    public List<string> KeyWeaknesses { get; set; } = new();

    [BsonElement("overallFeedback")]
    public string OverallFeedback { get; set; } = string.Empty;

    [BsonElement("isComplete")]
    public bool IsComplete { get; set; } = true; // Default to true for backward compatibility

    [BsonElement("questionScores")]
    public List<QuestionScoreData> QuestionScores { get; set; } = new();
    
    // Voice delivery metrics
    [BsonElement("averageVoiceConfidence")]
    public double? AverageVoiceConfidence { get; set; }
    
    [BsonElement("averageFillerPercentage")]
    public double? AverageFillerPercentage { get; set; }
    
    [BsonElement("averageSpeechPace")]
    public double? AverageSpeechPace { get; set; }
    
    [BsonElement("averageToneScore")]
    public double? AverageToneScore { get; set; }
    
    [BsonElement("averageVocalEnergy")]
    public double? AverageVocalEnergy { get; set; }
    
    [BsonElement("voiceAnswersCount")]
    public int VoiceAnswersCount { get; set; }
}

public class QuestionScoreData
{
    [BsonElement("questionNumber")]
    public int QuestionNumber { get; set; }

    [BsonElement("category")]
    public string Category { get; set; } = string.Empty;

    [BsonElement("question")]
    public string Question { get; set; } = string.Empty;

    [BsonElement("answer")]
    public string Answer { get; set; } = string.Empty;

    [BsonElement("score")]
    public double Score { get; set; }

    [BsonElement("confidenceScore")]
    public double ConfidenceScore { get; set; }

    [BsonElement("technicalAccuracy")]
    public double TechnicalAccuracy { get; set; }

    [BsonElement("clarity")]
    public double Clarity { get; set; }

    [BsonElement("depth")]
    public double Depth { get; set; }

    [BsonElement("feedback")]
    public string Feedback { get; set; } = string.Empty;

    [BsonElement("strengths")]
    public List<string> Strengths { get; set; } = new();

    [BsonElement("improvements")]
    public List<string> Improvements { get; set; } = new();

    [BsonElement("insights")]
    public List<string> Insights { get; set; } = new();
}
