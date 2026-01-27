namespace Interviewly.API.Configuration;

/// <summary>
/// Configuration settings for Gemini AI integration
/// </summary>
public class GeminiSettings
{
    public const string SectionName = "GeminiSettings";
    
    public string ApiKey { get; set; } = string.Empty;
    public string ModelName { get; set; } = "gemini-1.5-pro";
}

/// <summary>
/// Configuration settings for MongoDB connection
/// </summary>
public class MongoDbSettings
{
    public const string SectionName = "MongoDbSettings";
    
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = "InterviewlyDB";
}

/// <summary>
/// Configuration settings for Crawl4AI scraper service
/// </summary>
public class Crawl4AISettings
{
    public const string SectionName = "Crawl4AISettings";
    
    public string BaseUrl { get; set; } = "http://localhost:8000";
}
