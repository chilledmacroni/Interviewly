using Microsoft.AspNetCore.Mvc;
using Interviewly.API.Services;
using Interviewly.API.Models;

namespace Interviewly.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TTSController : ControllerBase
{
    private readonly ITTSService _ttsService;
    private readonly ILogger<TTSController> _logger;

    public TTSController(ITTSService ttsService, ILogger<TTSController> logger)
    {
        _ttsService = ttsService;
        _logger = logger;
    }

    /// <summary>
    /// Convert text to speech using pyttsx3 (system TTS)
    /// </summary>
    /// <param name="request">TTS request containing text to convert</param>
    /// <returns>Audio file in base64 format</returns>
    [HttpPost("speak")]
    [ProducesResponseType(typeof(TTSResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<TTSResponse>> Speak([FromBody] TTSRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Text))
            {
                return BadRequest(new TTSResponse { Success = false, Error = "Text is required" });
            }

            _logger.LogInformation("[TTS-PYTTSX3 API] Generating speech for {Length} characters", request.Text.Length);

            // Call the pyttsx3 Python script instead
            var workspaceRoot = Directory.GetParent(AppDomain.CurrentDomain.BaseDirectory)?.Parent?.Parent?.Parent?.Parent?.Parent?.FullName;
            var pythonScriptPath = Path.Combine(workspaceRoot ?? "", "voice-service", "tts_service_pyttsx3.py");
            var tempAudioPath = Path.Combine(Path.GetTempPath(), "interviewly-tts");
            Directory.CreateDirectory(tempAudioPath);
            var tempAudioFile = Path.Combine(tempAudioPath, $"tts_{Guid.NewGuid()}.wav");

            var processInfo = new System.Diagnostics.ProcessStartInfo
            {
                FileName = "python",
                Arguments = $"\"{pythonScriptPath}\" \"{request.Text}\" \"{tempAudioFile}\"",
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            using var process = new System.Diagnostics.Process { StartInfo = processInfo };
            var errorBuilder = new System.Text.StringBuilder();

            process.ErrorDataReceived += (sender, args) =>
            {
                if (!string.IsNullOrEmpty(args.Data))
                {
                    errorBuilder.AppendLine(args.Data);
                    _logger.LogWarning("[TTS-PYTTSX3] {Error}", args.Data);
                }
            };

            process.Start();
            process.BeginErrorReadLine();

            var completed = await Task.Run(() => process.WaitForExit(90000));

            if (!completed || process.ExitCode != 0 || !System.IO.File.Exists(tempAudioFile))
            {
                return Ok(new TTSResponse
                {
                    Success = false,
                    Error = $"Pyttsx3 generation failed: {errorBuilder}"
                });
            }

            var audioBytes = await System.IO.File.ReadAllBytesAsync(tempAudioFile);
            var audioBase64 = Convert.ToBase64String(audioBytes);

            try { System.IO.File.Delete(tempAudioFile); } catch { }

            _logger.LogInformation("[TTS-PYTTSX3 API] ✓ Speech generated ({Size} bytes)", audioBytes.Length);

            return Ok(new TTSResponse
            {
                Success = true,
                AudioBase64 = audioBase64,
                FileSizeBytes = audioBytes.Length
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TTS-PYTTSX3 API] Error");
            return Ok(new TTSResponse { Success = false, Error = "Internal server error" });
        }
    }
}
