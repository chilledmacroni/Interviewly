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
    /// Resume text content (required: resume must be provided either as text or as uploaded file data)
    /// </summary>
    public string? ResumeText { get; set; }

    /// <summary>
    /// Job description text content (optional)
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

    /// <summary>
    /// Voice confidence score from voice analysis (0-100), optional
    /// </summary>
    public double? VoiceConfidence { get; set; }

    /// <summary>
    /// Voice metrics from analysis, optional
    /// </summary>
    public VoiceMetricsData? VoiceMetrics { get; set; }
    
    /// <summary>
    /// Complete voice analysis result, optional
    /// </summary>
    public VoiceAnalysisData? VoiceAnalysis { get; set; }
}

/// <summary>
/// Complete voice analysis data matching frontend structure
/// </summary>
public class VoiceAnalysisData
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }
    
    [JsonPropertyName("transcript")]
    public string? Transcript { get; set; }
    
    [JsonPropertyName("clean_transcript")]
    public string? CleanTranscript { get; set; }
    
    [JsonPropertyName("confidence_score")]
    public double ConfidenceScore { get; set; }
    
    [JsonPropertyName("analysis")]
    public VoiceAnalysisDetails? Analysis { get; set; }
}

public class VoiceAnalysisDetails
{
    [JsonPropertyName("filler_words")]
    public FillerWordsData? FillerWords { get; set; }
    
    [JsonPropertyName("sentiment")]
    public SentimentData? Sentiment { get; set; }
    
    [JsonPropertyName("speech_pace")]
    public SpeechPaceData? SpeechPace { get; set; }
    
    [JsonPropertyName("voice_quality")]
    public VoiceQualityData? VoiceQuality { get; set; }
}

public class FillerWordsData
{
    [JsonPropertyName("count")]
    public int Count { get; set; }
    
    [JsonPropertyName("percentage")]
    public double Percentage { get; set; }
    
    [JsonPropertyName("found")]
    public Dictionary<string, int> Found { get; set; } = new();
}

public class SentimentData
{
    [JsonPropertyName("positive")]
    public double Positive { get; set; }
    
    [JsonPropertyName("neutral")]
    public double Neutral { get; set; }
    
    [JsonPropertyName("negative")]
    public double Negative { get; set; }
    
    [JsonPropertyName("compound")]
    public double Compound { get; set; }
}

public class SpeechPaceData
{
    [JsonPropertyName("words_per_minute")]
    public double WordsPerMinute { get; set; }
    
    [JsonPropertyName("pace_rating")]
    public string PaceRating { get; set; } = string.Empty;
}

public class VoiceQualityData
{
    [JsonPropertyName("pitch_variation")]
    public double PitchVariation { get; set; }
    
    [JsonPropertyName("energy_level")]
    public double EnergyLevel { get; set; }
    
    [JsonPropertyName("clarity_score")]
    public double ClarityScore { get; set; }
}

/// <summary>
/// Voice analysis metrics
/// </summary>
public class VoiceMetricsData
{
    public double SentimentScore { get; set; }
    public string SentimentLabel { get; set; } = string.Empty;
    public int FillerCount { get; set; }
    public double FillerPercentage { get; set; }
    public double WordsPerMinute { get; set; }
    public string PaceRating { get; set; } = string.Empty;
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
    /// Overall confidence score from 0-10
    /// </summary>
    public int Score { get; set; }

    /// <summary>
    /// Confidence level in candidate's understanding (0-10)
    /// </summary>
    public int ConfidenceScore { get; set; }

    /// <summary>
    /// Technical accuracy rating (0-10)
    /// </summary>
    public int TechnicalAccuracy { get; set; }

    /// <summary>
    /// Clarity of explanation (0-10)
    /// </summary>
    public int Clarity { get; set; }

    /// <summary>
    /// Depth of understanding (0-10)
    /// </summary>
    public int Depth { get; set; }

    /// <summary>
    /// Voice confidence from speech analysis (0-10), null if text-only
    /// </summary>
    public int? VoiceConfidence { get; set; }

    /// <summary>
    /// Combined score (70% content + 30% voice), equals Score if no voice
    /// </summary>
    public int CombinedScore { get; set; }

    /// <summary>
    /// Detailed feedback on the answer
    /// </summary>
    public string Feedback { get; set; } = string.Empty;

    /// <summary>
    /// Key strengths identified
    /// </summary>
    public List<string> Strengths { get; set; } = new();

    /// <summary>
    /// Exactly 3 improvement tips
    /// </summary>
    public List<string> Improvements { get; set; } = new();

    /// <summary>
    /// Exactly 2 insights about the answer
    /// </summary>
    public List<string> Insights { get; set; } = new();

    /// <summary>
    /// Voice metrics if voice was used
    /// </summary>
    public VoiceMetricsData? VoiceMetrics { get; set; }
}

/// <summary>
/// Interview summary after completion
/// </summary>
public class InterviewSummary
{
    /// <summary>
    /// Overall performance score (average of all questions)
    /// </summary>
    public double OverallScore { get; set; }

    /// <summary>
    /// Average confidence score across all answers
    /// </summary>
    public double AverageConfidence { get; set; }

    /// <summary>
    /// Average score for technical questions (Q1-3)
    /// </summary>
    public double TechnicalAverage { get; set; }

    /// <summary>
    /// Average score for behavioral questions (Q4-5)
    /// </summary>
    public double BehavioralAverage { get; set; }

    /// <summary>
    /// Score for situational question (Q6)
    /// </summary>
    public double SituationalScore { get; set; }

    /// <summary>
    /// Total questions answered
    /// </summary>
    public int QuestionsAnswered { get; set; }

    /// <summary>
    /// Individual question scores
    /// </summary>
    public List<QuestionScore> QuestionScores { get; set; } = new();

    /// <summary>
    /// Top strengths across all answers
    /// </summary>
    public List<string> TopStrengths { get; set; } = new();

    /// <summary>
    /// Key areas for improvement
    /// </summary>
    public List<string> KeyWeaknesses { get; set; } = new();

    /// <summary>
    /// Overall feedback and recommendations
    /// </summary>
    public string OverallFeedback { get; set; } = string.Empty;
    
    /// <summary>
    /// Average voice delivery confidence across all voice answers (0-100)
    /// </summary>
    public double? AverageVoiceConfidence { get; set; }
    
    /// <summary>
    /// Average filler words percentage across all voice answers
    /// </summary>
    public double? AverageFillerPercentage { get; set; }
    
    /// <summary>
    /// Average speech pace (WPM) across all voice answers
    /// </summary>
    public double? AverageSpeechPace { get; set; }
    
    /// <summary>
    /// Average sentiment/tone score (-1 to +1) across all voice answers
    /// </summary>
    public double? AverageToneScore { get; set; }
    
    /// <summary>
    /// Average vocal energy (0-10) across all voice answers
    /// </summary>
    public double? AverageVocalEnergy { get; set; }
    
    /// <summary>
    /// Number of questions answered with voice
    /// </summary>
    public int VoiceAnswersCount { get; set; }
}

/// <summary>
/// Score for an individual question
/// </summary>
public class QuestionScore
{
    public int QuestionNumber { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int Score { get; set; }
    public int ConfidenceScore { get; set; }
    public int TechnicalAccuracy { get; set; }
    public int Clarity { get; set; }
    public int Depth { get; set; }
    public string Feedback { get; set; } = string.Empty;
    public List<string> Strengths { get; set; } = new();
    public List<string> Improvements { get; set; } = new();
    public List<string> Insights { get; set; } = new();
    
    // Voice delivery metrics (null if answered with text)
    public double? VoiceConfidence { get; set; }
    public VoiceDeliveryMetrics? VoiceDelivery { get; set; }
}

/// <summary>
/// Voice delivery analysis metrics for a single answer
/// </summary>
public class VoiceDeliveryMetrics
{
    public int FillerWordsCount { get; set; }
    public double FillerWordsPercentage { get; set; }
    public double SpeechPaceWPM { get; set; }
    public string PaceRating { get; set; } = string.Empty;
    public double ToneScore { get; set; } // -1 to +1 compound sentiment
    public double VocalEnergy { get; set; } // 0-10
    public double Clarity { get; set; } // 0-10
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
