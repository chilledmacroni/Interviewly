using MongoDB.Driver;
using Interviewly.API.Models;
using Interviewly.API.Configuration;

namespace Interviewly.API.Services;

public class InterviewHistoryService
{
    private readonly IMongoCollection<InterviewResult> _interviews;

    public InterviewHistoryService(AppSettings settings)
    {
        var client = new MongoClient(settings.MongoDbSettings.ConnectionString);
        var database = client.GetDatabase(settings.MongoDbSettings.DatabaseName);
        _interviews = database.GetCollection<InterviewResult>("interview_results");
    }

    public async Task<string> SaveInterviewResultAsync(InterviewResult result)
    {
        await _interviews.InsertOneAsync(result);
        return result.Id ?? string.Empty;
    }

    public async Task<List<InterviewResult>> GetUserInterviewHistoryAsync(string userId)
    {
        var filter = Builders<InterviewResult>.Filter.Eq(r => r.UserId, userId);
        var sort = Builders<InterviewResult>.Sort.Descending(r => r.CompletedAt);
        
        return await _interviews.Find(filter)
            .Sort(sort)
            .ToListAsync();
    }

    public async Task<InterviewResult?> GetInterviewByIdAsync(string id, string userId)
    {
        var filter = Builders<InterviewResult>.Filter.And(
            Builders<InterviewResult>.Filter.Eq(r => r.Id, id),
            Builders<InterviewResult>.Filter.Eq(r => r.UserId, userId)
        );
        
        return await _interviews.Find(filter).FirstOrDefaultAsync();
    }

    public async Task<InterviewStats> GetUserStatsAsync(string userId)
    {
        var userInterviews = await GetUserInterviewHistoryAsync(userId);
        
        if (!userInterviews.Any())
        {
            return new InterviewStats
            {
                TotalInterviews = 0,
                AverageScore = 0,
                AverageConfidence = 0,
                HighestScore = 0,
                LowestScore = 0,
                RecentTrend = "N/A",
                TotalVoiceAnswers = 0
            };
        }

        var totalInterviews = userInterviews.Count;
        var avgScore = userInterviews.Average(i => i.OverallScore);
        var avgConfidence = userInterviews.Average(i => i.AverageConfidence);
        var highest = userInterviews.Max(i => i.OverallScore);
        var lowest = userInterviews.Min(i => i.OverallScore);
        
        // Calculate voice delivery metrics across all interviews
        var interviewsWithVoice = userInterviews.Where(i => i.VoiceAnswersCount > 0).ToList();
        double? avgVoiceConfidence = null;
        double? avgFillerPercentage = null;
        double? avgSpeechPace = null;
        double? avgToneScore = null;
        double? avgVocalEnergy = null;
        int totalVoiceAnswers = 0;
        
        if (interviewsWithVoice.Any())
        {
            avgVoiceConfidence = interviewsWithVoice
                .Where(i => i.AverageVoiceConfidence.HasValue)
                .Average(i => i.AverageVoiceConfidence!.Value);
            avgFillerPercentage = interviewsWithVoice
                .Where(i => i.AverageFillerPercentage.HasValue)
                .Average(i => i.AverageFillerPercentage!.Value);
            avgSpeechPace = interviewsWithVoice
                .Where(i => i.AverageSpeechPace.HasValue)
                .Average(i => i.AverageSpeechPace!.Value);
            avgToneScore = interviewsWithVoice
                .Where(i => i.AverageToneScore.HasValue)
                .Average(i => i.AverageToneScore!.Value);
            avgVocalEnergy = interviewsWithVoice
                .Where(i => i.AverageVocalEnergy.HasValue)
                .Average(i => i.AverageVocalEnergy!.Value);
            totalVoiceAnswers = interviewsWithVoice.Sum(i => i.VoiceAnswersCount);
        }

        // Calculate trend (last 3 vs previous)
        var trend = "Stable";
        if (totalInterviews >= 6)
        {
            var recent3 = userInterviews.Take(3).Average(i => i.OverallScore);
            var previous3 = userInterviews.Skip(3).Take(3).Average(i => i.OverallScore);
            
            if (recent3 > previous3 + 0.5) trend = "Improving";
            else if (recent3 < previous3 - 0.5) trend = "Declining";
        }

        return new InterviewStats
        {
            TotalInterviews = totalInterviews,
            AverageScore = avgScore,
            AverageConfidence = avgConfidence,
            HighestScore = highest,
            LowestScore = lowest,
            RecentTrend = trend,
            AverageVoiceConfidence = avgVoiceConfidence,
            AverageFillerPercentage = avgFillerPercentage,
            AverageSpeechPace = avgSpeechPace,
            AverageToneScore = avgToneScore,
            AverageVocalEnergy = avgVocalEnergy,
            TotalVoiceAnswers = totalVoiceAnswers
        };
    }

    public async Task<bool> DeleteInterviewAsync(string id, string userId)
    {
        var filter = Builders<InterviewResult>.Filter.And(
            Builders<InterviewResult>.Filter.Eq(r => r.Id, id),
            Builders<InterviewResult>.Filter.Eq(r => r.UserId, userId)
        );
        
        var result = await _interviews.DeleteOneAsync(filter);
        return result.DeletedCount > 0;
    }

    public async Task<long> DeleteAllUserInterviewsAsync(string userId)
    {
        var filter = Builders<InterviewResult>.Filter.Eq(r => r.UserId, userId);
        var result = await _interviews.DeleteManyAsync(filter);
        return result.DeletedCount;
    }
}

public class InterviewStats
{
    public int TotalInterviews { get; set; }
    public double AverageScore { get; set; }
    public double AverageConfidence { get; set; }
    public double HighestScore { get; set; }
    public double LowestScore { get; set; }
    public string RecentTrend { get; set; } = string.Empty;
    
    // Voice delivery metrics (averages across all interviews with voice)
    public double? AverageVoiceConfidence { get; set; }
    public double? AverageFillerPercentage { get; set; }
    public double? AverageSpeechPace { get; set; }
    public double? AverageToneScore { get; set; }
    public double? AverageVocalEnergy { get; set; }
    public int TotalVoiceAnswers { get; set; }
}
