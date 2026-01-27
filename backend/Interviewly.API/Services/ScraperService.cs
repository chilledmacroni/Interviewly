using System.Text.Json;
using System.Text.Json.Serialization;
using Interviewly.API.Configuration;
using Microsoft.Extensions.Options;

namespace Interviewly.API.Services;

/// <summary>
/// Service for bridging to the Crawl4AI Python microservice
/// </summary>
public interface IScraperService
{
    /// <summary>
    /// Scrapes content from a given URL using Crawl4AI
    /// </summary>
    /// <param name="url">The URL to scrape (e.g., job description page)</param>
    /// <returns>The extracted text content from the page</returns>
    Task<string> ScrapeUrlAsync(string url);
}

public class ScraperService : IScraperService
{
    private readonly HttpClient _httpClient;
    private readonly Crawl4AISettings _settings;
    private readonly ILogger<ScraperService> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public ScraperService(
        HttpClient httpClient,
        IOptions<Crawl4AISettings> settings,
        ILogger<ScraperService> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
        
        // Configure JSON serialization to use snake_case for Python compatibility
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
            WriteIndented = false
        };
    }

    public async Task<string> ScrapeUrlAsync(string url)
    {
        try
        {
            _logger.LogInformation("Scraping URL: {Url}", url);

            var request = new ScrapeRequest { Url = url };
            var content = new StringContent(
                JsonSerializer.Serialize(request, _jsonOptions),
                System.Text.Encoding.UTF8,
                "application/json"
            );

            var response = await _httpClient.PostAsync(
                $"{_settings.BaseUrl}/scrape",
                content
            );

            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Scraper service error: {StatusCode} - {Error}", 
                    response.StatusCode, errorContent);
                throw new HttpRequestException($"Scraper service returned {response.StatusCode}");
            }

            var responseJson = await response.Content.ReadAsStringAsync();
            var scrapeResponse = JsonSerializer.Deserialize<ScrapeResponse>(responseJson, 
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (scrapeResponse == null || string.IsNullOrEmpty(scrapeResponse.Content))
            {
                throw new InvalidOperationException("Empty response from scraper service");
            }

            _logger.LogInformation("Successfully scraped {Length} characters from {Url}", 
                scrapeResponse.Content.Length, url);

            return scrapeResponse.Content;
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "Failed to connect to Crawl4AI service at {BaseUrl}", _settings.BaseUrl);
            throw new InvalidOperationException(
                "Unable to connect to scraper service. Please ensure Crawl4AI is running.", ex);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scraping URL: {Url}", url);
            throw;
        }
    }
}

/// <summary>
/// Request model for the Crawl4AI scrape endpoint
/// </summary>
internal class ScrapeRequest
{
    public string Url { get; set; } = string.Empty;
    public bool ExtractMarkdown { get; set; } = true;
    public bool CleanContent { get; set; } = true;
}

/// <summary>
/// Response model from the Crawl4AI scrape endpoint
/// </summary>
internal class ScrapeResponse
{
    public string Content { get; set; } = string.Empty;
    public string? Title { get; set; }
    public bool Success { get; set; }
    public string? Error { get; set; }
}
