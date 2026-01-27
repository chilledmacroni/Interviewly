using Interviewly.API.Configuration;
using Interviewly.API.Models;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using System.Text;
using System.Text.Json;

namespace Interviewly.API.Services;

public interface IDashboardService
{
    Task<DashboardSummary> GetDashboardSummaryAsync(string userId);
    Task<List<SessionHistoryItem>> GetSessionHistoryAsync(string userId, int limit = 10);
    Task<SessionDetailResponse?> GetSessionDetailAsync(string sessionId, string userId);
}

public class DashboardService : IDashboardService
{
    private readonly IMongoCollection<InterviewSession> _sessions;
    private readonly HttpClient _httpClient;
    private readonly GeminiSettings _geminiSettings;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(
        IOptions<MongoDbSettings> mongoSettings,
        IOptions<GeminiSettings> geminiSettings,
        IHttpClientFactory httpClientFactory,
        ILogger<DashboardService> logger)
    {
        var mongoClient = new MongoClient(mongoSettings.Value.ConnectionString);
        var mongoDatabase = mongoClient.GetDatabase(mongoSettings.Value.DatabaseName);
        _sessions = mongoDatabase.GetCollection<InterviewSession>("InterviewSessions");
        _httpClient = httpClientFactory.CreateClient();
        _geminiSettings = geminiSettings.Value;
        _logger = logger;
    }

    public async Task<DashboardSummary> GetDashboardSummaryAsync(string userId)
    {
        // Get all completed sessions for the user
        var sessions = await _sessions
            .Find(s => s.UserId == userId && s.IsComplete)
            .SortByDescending(s => s.CreatedAt)
            .ToListAsync();

        if (!sessions.Any())
        {
            return new DashboardSummary
            {
                AverageScore = 0,
                TotalInterviews = 0,
                StrongPoints = "Complete your first interview to see your strong points!",
                RecentSessions = new List<SessionHistoryItem>()
            };
        }

        // Calculate average score
        var averageScore = sessions
            .Where(s => s.OverallScore.HasValue)
            .Average(s => s.OverallScore!.Value);

        // Generate strong points using Gemini
        var strongPoints = await GenerateStrongPointsAsync(sessions);

        // Get recent sessions
        var recentSessions = sessions
            .Take(10)
            .Select(s => new SessionHistoryItem
            {
                Id = s.Id,
                Date = s.CompletedAt ?? s.CreatedAt,
                TechStack = s.TechStack,
                Score = s.OverallScore ?? 0,
                Difficulty = s.Difficulty,
                QuestionsAnswered = s.Scores.Count
            })
            .ToList();

        return new DashboardSummary
        {
            AverageScore = Math.Round(averageScore, 1),
            TotalInterviews = sessions.Count,
            StrongPoints = strongPoints,
            RecentSessions = recentSessions
        };
    }

    public async Task<List<SessionHistoryItem>> GetSessionHistoryAsync(string userId, int limit = 10)
    {
        var sessions = await _sessions
            .Find(s => s.UserId == userId && s.IsComplete)
            .SortByDescending(s => s.CreatedAt)
            .Limit(limit)
            .ToListAsync();

        return sessions.Select(s => new SessionHistoryItem
        {
            Id = s.Id,
            Date = s.CompletedAt ?? s.CreatedAt,
            TechStack = s.TechStack,
            Score = s.OverallScore ?? 0,
            Difficulty = s.Difficulty,
            QuestionsAnswered = s.Scores.Count
        }).ToList();
    }

    public async Task<SessionDetailResponse?> GetSessionDetailAsync(string sessionId, string userId)
    {
        var session = await _sessions
            .Find(s => s.Id == sessionId && s.UserId == userId)
            .FirstOrDefaultAsync();

        if (session == null)
        {
            return null;
        }

        // Generate overall feedback if not already present
        var overallFeedback = await GenerateOverallFeedbackAsync(session);

        return new SessionDetailResponse
        {
            Id = session.Id,
            Date = session.CompletedAt ?? session.CreatedAt,
            TechStack = session.TechStack,
            Difficulty = session.Difficulty,
            OverallScore = session.OverallScore ?? 0,
            Transcript = session.Conversation,
            Scores = session.Scores,
            OverallFeedback = overallFeedback
        };
    }

    private async Task<string> GenerateStrongPointsAsync(List<InterviewSession> sessions)
    {
        try
        {
            // Get top-scoring answers across all sessions
            var topAnswers = sessions
                .SelectMany(s => s.Scores)
                .Where(score => score.Score >= 7) // Only high-scoring answers
                .OrderByDescending(score => score.Score)
                .Take(10)
                .ToList();

            if (!topAnswers.Any())
            {
                return "Keep practicing! Your strong points will appear here as you improve.";
            }

            // Build prompt for Gemini
            var answersText = new StringBuilder();
            foreach (var answer in topAnswers)
            {
                answersText.AppendLine($"Q: {answer.Question}");
                answersText.AppendLine($"A: {answer.Answer}");
                answersText.AppendLine($"Score: {answer.Score}/10");
                answersText.AppendLine();
            }

            var prompt = $@"Based on the following high-scoring interview answers, identify and summarize the candidate's TOP 3 STRONG POINTS in a concise, encouraging format. Focus on technical skills, communication style, and problem-solving approach.

{answersText}

Provide a brief, bullet-point summary (3-4 sentences total) highlighting their strengths.";

            var response = await CallGeminiAsync(prompt);
            return response ?? "Strong technical foundation with good problem-solving skills.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating strong points");
            return "Strong technical foundation with good problem-solving skills.";
        }
    }

    private async Task<string> GenerateOverallFeedbackAsync(InterviewSession session)
    {
        try
        {
            if (!session.Scores.Any())
            {
                return "No feedback available for this session.";
            }

            var averageScore = session.Scores.Average(s => s.Score);
            var transcript = new StringBuilder();

            foreach (var score in session.Scores)
            {
                transcript.AppendLine($"Q: {score.Question}");
                transcript.AppendLine($"A: {score.Answer}");
                transcript.AppendLine($"Score: {score.Score}/10");
                transcript.AppendLine($"Feedback: {score.Feedback}");
                transcript.AppendLine();
            }

            var prompt = $@"Provide a comprehensive overall performance summary for this interview. 

Tech Stack: {session.TechStack}
Difficulty: {session.Difficulty}
Average Score: {averageScore:F1}/10

Interview Transcript:
{transcript}

Provide:
1. Overall Performance Assessment (2-3 sentences)
2. Key Strengths (2-3 bullet points)
3. Areas for Improvement (2-3 bullet points)
4. Actionable Next Steps (2-3 recommendations)

Keep it encouraging but honest.";

            var response = await CallGeminiAsync(prompt);
            return response ?? "Good effort! Continue practicing to improve your interview skills.";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating overall feedback");
            return "Good effort! Continue practicing to improve your interview skills.";
        }
    }

    private async Task<string?> CallGeminiAsync(string prompt)
    {
        try
        {
            var requestBody = new
            {
                contents = new[]
                {
                    new
                    {
                        parts = new[]
                        {
                            new { text = prompt }
                        }
                    }
                },
                generationConfig = new
                {
                    temperature = 0.7,
                    maxOutputTokens = 500
                }
            };

            var json = JsonSerializer.Serialize(requestBody);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var modelName = !string.IsNullOrEmpty(_geminiSettings.ModelName) ? _geminiSettings.ModelName : "gemini-1.5-flash";
        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{modelName}:generateContent?key={_geminiSettings.ApiKey}";
        var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Gemini API error: {StatusCode}", response.StatusCode);
                return null;
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            var geminiResponse = JsonSerializer.Deserialize<JsonElement>(responseJson);

            var text = geminiResponse
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return text;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling Gemini API");
            return null;
        }
    }
}
