using System.Diagnostics;
using System.Text;
using Interviewly.API.Models;

namespace Interviewly.API.Services;

/// <summary>
/// Service for text-to-speech conversion using pyttsx3 (system TTS)
/// </summary>
public interface ITTSService
{
    Task<TTSResponse> GenerateSpeechAsync(string text);
}

public class TTSService : ITTSService
{
    private readonly ILogger<TTSService> _logger;
    private readonly string _pythonScriptPath;
    private readonly string _tempAudioPath;

    public TTSService(ILogger<TTSService> logger, IConfiguration configuration)
    {
        _logger = logger;
        
        // Get Python script path from configuration or default
        // Navigate from: backend/Interviewly.API/bin/Debug/net8.0/ -> backend/Interviewly.API/ -> backend/ -> root
        var workspaceRoot = Directory.GetParent(AppDomain.CurrentDomain.BaseDirectory)?.Parent?.Parent?.Parent?.Parent?.Parent?.FullName;
        _pythonScriptPath = Path.Combine(workspaceRoot ?? "", "voice-service", "tts_service_pyttsx3.py");
        _tempAudioPath = Path.Combine(Path.GetTempPath(), "interviewly-tts");
        
        // Create temp directory if it doesn't exist
        Directory.CreateDirectory(_tempAudioPath);
        
        _logger.LogInformation("[TTS] Python script path: {ScriptPath}", _pythonScriptPath);
        _logger.LogInformation("[TTS] Temp audio path: {TempPath}", _tempAudioPath);
    }

    public async Task<TTSResponse> GenerateSpeechAsync(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return new TTSResponse
            {
                Success = false,
                Error = "Text cannot be empty"
            };
        }

        var tempAudioFile = Path.Combine(_tempAudioPath, $"tts_{Guid.NewGuid()}.wav");

        try
        {
            _logger.LogInformation("[TTS] Generating speech for text: {TextPreview}...", 
                text.Length > 50 ? text.Substring(0, 50) + "..." : text);

            // Prepare Python command
            var pythonArgs = $"\"{_pythonScriptPath}\" \"{EscapeForShell(text)}\" \"{tempAudioFile}\"";
            
            var processStartInfo = new ProcessStartInfo
            {
                FileName = "python",
                Arguments = pythonArgs,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new Process { StartInfo = processStartInfo };
            var outputBuilder = new StringBuilder();
            var errorBuilder = new StringBuilder();

            process.OutputDataReceived += (sender, args) =>
            {
                if (!string.IsNullOrEmpty(args.Data))
                {
                    outputBuilder.AppendLine(args.Data);
                    _logger.LogDebug("[TTS] Python output: {Output}", args.Data);
                }
            };

            process.ErrorDataReceived += (sender, args) =>
            {
                if (!string.IsNullOrEmpty(args.Data))
                {
                    errorBuilder.AppendLine(args.Data);
                    _logger.LogWarning("[TTS] Python error: {Error}", args.Data);
                }
            };

            process.Start();
            process.BeginOutputReadLine();
            process.BeginErrorReadLine();

            // Wait for Python script to complete (90 second timeout for longer messages)
            var completed = await Task.Run(() => process.WaitForExit(90000));

            if (!completed)
            {
                process.Kill();
                _logger.LogError("[TTS] Python process timed out after 90 seconds");
                return new TTSResponse
                {
                    Success = false,
                    Error = "Text-to-speech generation timed out"
                };
            }

            if (process.ExitCode != 0)
            {
                var error = errorBuilder.ToString();
                _logger.LogError("[TTS] Python process exited with code {ExitCode}: {Error}", 
                    process.ExitCode, error);
                return new TTSResponse
                {
                    Success = false,
                    Error = $"Speech generation failed: {error}"
                };
            }

            // Check if audio file was created
            if (!File.Exists(tempAudioFile))
            {
                _logger.LogError("[TTS] Audio file was not created: {FilePath}", tempAudioFile);
                return new TTSResponse
                {
                    Success = false,
                    Error = "Audio file generation failed"
                };
            }

            // Read audio file and convert to base64
            var audioBytes = await File.ReadAllBytesAsync(tempAudioFile);
            var audioBase64 = Convert.ToBase64String(audioBytes);

            _logger.LogInformation("[TTS] ✓ Speech generated successfully ({Size} bytes)", audioBytes.Length);

            // Clean up temp file
            try
            {
                File.Delete(tempAudioFile);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[TTS] Failed to delete temp file: {FilePath}", tempAudioFile);
            }

            return new TTSResponse
            {
                Success = true,
                AudioBase64 = audioBase64,
                FileSizeBytes = audioBytes.Length,
                TextLength = text.Length
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TTS] Error generating speech");
            
            // Clean up temp file on error
            try
            {
                if (File.Exists(tempAudioFile))
                {
                    File.Delete(tempAudioFile);
                }
            }
            catch { }

            return new TTSResponse
            {
                Success = false,
                Error = $"Internal error: {ex.Message}"
            };
        }
    }

    private string EscapeForShell(string input)
    {
        // Escape quotes and backslashes for shell arguments
        return input.Replace("\\", "\\\\").Replace("\"", "\\\"");
    }
}
