using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Interviewly.API.Services;

public class VoiceAnalysisService
{
    private readonly ILogger<VoiceAnalysisService> _logger;
    private readonly string _pythonScriptPath;
    private readonly string _tempAudioPath;

    public VoiceAnalysisService(ILogger<VoiceAnalysisService> logger, IConfiguration configuration)
    {
        _logger = logger;
        
        // Path to Python script
        var projectRoot = Directory.GetCurrentDirectory();
        var solutionRoot = Directory.GetParent(projectRoot)?.Parent?.FullName ?? projectRoot;
        _pythonScriptPath = Path.Combine(solutionRoot, "voice-service", "voice_analyzer.py");
        
        // Temp folder for audio files
        _tempAudioPath = Path.Combine(Path.GetTempPath(), "interviewly-audio");
        Directory.CreateDirectory(_tempAudioPath);
        
        _logger.LogInformation($"[VOICE] Python script path: {_pythonScriptPath}");
        _logger.LogInformation($"[VOICE] Temp audio path: {_tempAudioPath}");
    }

    public async Task<VoiceAnalysisResult> AnalyzeAudioAsync(Stream audioStream, string originalFileName)
    {
        string tempFilePath = null!;
        
        try
        {
            // Generate unique filename
            var fileExtension = Path.GetExtension(originalFileName);
            var tempFileName = $"{Guid.NewGuid()}{fileExtension}";
            tempFilePath = Path.Combine(_tempAudioPath, tempFileName);

            // Save audio to temp file
            _logger.LogInformation($"[VOICE] Saving audio to: {tempFilePath}");
            await using (var fileStream = File.Create(tempFilePath))
            {
                await audioStream.CopyToAsync(fileStream);
            }
            
            // Call Python script (optimized with caching)
            _logger.LogInformation($"[VOICE] Calling Python analyzer...");
            var result = await CallPythonAnalyzer(tempFilePath);
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[VOICE] Error analyzing audio");
            return new VoiceAnalysisResult
            {
                Success = false,
                Error = $"Failed to analyze audio: {ex.Message}"
            };
        }
        finally
        {
            // Cleanup temp file
            if (!string.IsNullOrEmpty(tempFilePath) && File.Exists(tempFilePath))
            {
                try
                {
                    File.Delete(tempFilePath);
                    _logger.LogInformation($"[VOICE] Deleted temp file: {tempFilePath}");
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"[VOICE] Failed to delete temp file: {tempFilePath}");
                }
            }
        }
    }

    private async Task<VoiceAnalysisResult> CallPythonAnalyzer(string audioFilePath)
    {
        try
        {
            var processInfo = new ProcessStartInfo
            {
                FileName = "python",
                Arguments = $"\"{_pythonScriptPath}\" \"{audioFilePath}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            _logger.LogInformation($"[VOICE] Executing: python \"{_pythonScriptPath}\" \"{audioFilePath}\"");

            var sw = Stopwatch.StartNew();
            
            using var process = new Process { StartInfo = processInfo };
            process.Start();

            // Set timeout to 90 seconds (first run loads model, subsequent runs are fast)
            var timeoutTask = Task.Delay(TimeSpan.FromSeconds(90));
            var processTask = process.WaitForExitAsync();
            
            if (await Task.WhenAny(processTask, timeoutTask) == timeoutTask)
            {
                _logger.LogWarning("[VOICE] Python process timed out after 30 seconds");
                try { process.Kill(); } catch { }
                
                return new VoiceAnalysisResult
                {
                    Success = false,
                    Error = "Voice processing timed out after 30 seconds."
                };
            }

            // Read output
            var output = await process.StandardOutput.ReadToEndAsync();
            var errors = await process.StandardError.ReadToEndAsync();

            sw.Stop();
            _logger.LogInformation($"[VOICE] Processing took {sw.ElapsedMilliseconds}ms");

            // Log stderr (model loading messages)
            if (!string.IsNullOrEmpty(errors))
            {
                _logger.LogInformation($"[VOICE] Python info: {errors.Substring(0, Math.Min(200, errors.Length))}");
            }

            // Parse JSON output
            var result = JsonSerializer.Deserialize<VoiceAnalysisResult>(output, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            if (result == null)
            {
                return new VoiceAnalysisResult
                {
                    Success = false,
                    Error = "Failed to parse Python output"
                };
            }

            _logger.LogInformation($"[VOICE] ✓ Success! Confidence: {result.ConfidenceScore}/100");

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[VOICE] Error calling Python analyzer");
            return new VoiceAnalysisResult
            {
                Success = false,
                Error = $"Python execution error: {ex.Message}"
            };
        }
    }
}

public class VoiceAnalysisResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
    public string Transcript { get; set; } = string.Empty;
    
    [JsonPropertyName("clean_transcript")]
    public string? CleanTranscript { get; set; }
    
    [JsonPropertyName("confidence_score")]
    public double ConfidenceScore { get; set; }
    
    public VoiceAnalysis? Analysis { get; set; }
}

public class VoiceAnalysis
{
    [JsonPropertyName("filler_words")]
    public FillerWordsAnalysis FillerWords { get; set; } = new();
    
    public SentimentAnalysis Sentiment { get; set; } = new();
    
    [JsonPropertyName("speech_pace")]
    public SpeechPaceAnalysis SpeechPace { get; set; } = new();
    
    [JsonPropertyName("voice_quality")]
    public VoiceQualityAnalysis VoiceQuality { get; set; } = new();
}

public class FillerWordsAnalysis
{
    public int Count { get; set; }
    public double Percentage { get; set; }
    public Dictionary<string, int> Found { get; set; } = new();
}

public class SentimentAnalysis
{
    public double Positive { get; set; }
    public double Neutral { get; set; }
    public double Negative { get; set; }
    public double Compound { get; set; }
}

public class SpeechPaceAnalysis
{
    [JsonPropertyName("words_per_minute")]
    public double WordsPerMinute { get; set; }
    
    [JsonPropertyName("pace_rating")]
    public string PaceRating { get; set; } = string.Empty;
}

public class VoiceQualityAnalysis
{
    [JsonPropertyName("pitch_variation")]
    public double PitchVariation { get; set; }
    
    [JsonPropertyName("energy_level")]
    public double EnergyLevel { get; set; }
    
    [JsonPropertyName("clarity_score")]
    public double ClarityScore { get; set; }
}
