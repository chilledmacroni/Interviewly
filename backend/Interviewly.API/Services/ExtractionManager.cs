using System.Text.Json;
using Interviewly.API.Configuration;
using Interviewly.API.Models;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;

namespace Interviewly.API.Services;

public interface IExtractionManager
{
    Task<ResumeExtractionResult> ExtractResumeAsync(IFormFile file);
    Task<JdExtractionResult> ExtractJdAsync(string url);
}

public class ExtractionManager : IExtractionManager
{
    private readonly HttpClient _httpClient;
    private readonly Crawl4AISettings _settings;
    private readonly ILogger<ExtractionManager> _logger;

    public ExtractionManager(
        HttpClient httpClient,
        IOptions<Crawl4AISettings> settings,
        ILogger<ExtractionManager> logger)
    {
        _httpClient = httpClient;
        _settings = settings.Value;
        _logger = logger;
    }

    public async Task<ResumeExtractionResult> ExtractResumeAsync(IFormFile file)
    {
        try
        {
            Console.WriteLine($"[EXTRACTION] Starting resume extraction for: {file.FileName}");
            _logger.LogInformation("Extracting resume: {FileName}", file.FileName);

            using var content = new MultipartFormDataContent();
            using var fileStream = file.OpenReadStream();
            using var streamContent = new StreamContent(fileStream);
            streamContent.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/pdf");
            
            content.Add(streamContent, "file", file.FileName);

            Console.WriteLine($"[EXTRACTION] Sending {file.Length} bytes to Python service at {_settings.BaseUrl}/extract/resume");
            var response = await _httpClient.PostAsync($"{_settings.BaseUrl}/extract/resume", content);
            
            if (!response.IsSuccessStatusCode)
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[EXTRACTION] ❌ Resume extraction failed: {response.StatusCode} - {error}");
                _logger.LogError("Resume extraction failed: {StatusCode} - {Error}", response.StatusCode, error);
                return new ResumeExtractionResult { Success = false, Error = $"Service error: {response.StatusCode}" };
            }

            var result = await response.Content.ReadFromJsonAsync<ResumeExtractionResult>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            if (result == null)
            {
                Console.WriteLine("[EXTRACTION] ❌ Empty response from Python service");
                return new ResumeExtractionResult { Success = false, Error = "Empty response" };
            }
            
            if (!result.Success)
            {
                Console.WriteLine($"[EXTRACTION] ❌ Python service reported failure: {result.Error}");
                return result;
            }
            
            Console.WriteLine($"[EXTRACTION] ✓ Resume extracted successfully: {result.Text?.Length ?? 0} characters");
            Console.WriteLine($"[EXTRACTION DEBUG] First 200 chars: {result.Text?.Substring(0, Math.Min(200, result.Text?.Length ?? 0))}");
                
            return result;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[EXTRACTION] ❌ Exception: {ex.Message}");
            _logger.LogError(ex, "Error extracting resume");
            return new ResumeExtractionResult { Success = false, Error = ex.Message };
        }
    }

    public async Task<JdExtractionResult> ExtractJdAsync(string url)
    {
        try
        {
            Console.WriteLine($"[EXTRACTION] Starting JD extraction from URL: {url}");
            _logger.LogInformation("Extracting JD from URL: {Url}", url);

            var request = new { Url = url };
            var response = await _httpClient.PostAsJsonAsync($"{_settings.BaseUrl}/scrape", request);

            if (!response.IsSuccessStatusCode)
            {
                 var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[EXTRACTION] ❌ JD extraction failed: {response.StatusCode} - {error}");
                _logger.LogError("JD extraction failed: {StatusCode} - {Error}", response.StatusCode, error);
                return new JdExtractionResult { Success = false, Error = $"Service error: {response.StatusCode}" };
            }

            var result = await response.Content.ReadFromJsonAsync<JdExtractionResult>(
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            if (result == null)
            {
                Console.WriteLine("[EXTRACTION] ❌ Empty response from Python service");
                return new JdExtractionResult { Success = false, Error = "Empty response" };
            }
            
            if (!result.Success)
            {
                Console.WriteLine($"[EXTRACTION] ❌ Python service reported failure: {result.Error}");
                return result;
            }
            
            Console.WriteLine($"[EXTRACTION] ✓ JD extracted successfully: {result.Content?.Length ?? 0} characters");
            Console.WriteLine($"[EXTRACTION DEBUG] First 200 chars: {result.Content?.Substring(0, Math.Min(200, result.Content?.Length ?? 0))}");

            return result;
        }
        catch (Exception ex)
        {
             Console.WriteLine($"[EXTRACTION] ❌ Exception: {ex.Message}");
             _logger.LogError(ex, "Error extracting JD");
            return new JdExtractionResult { Success = false, Error = ex.Message };
        }
    }
}
