namespace Interviewly.API.Models;

/// <summary>
/// Request model for text-to-speech generation
/// </summary>
public class TTSRequest
{
    public string Text { get; set; } = string.Empty;
}

/// <summary>
/// Response model for text-to-speech generation
/// </summary>
public class TTSResponse
{
    public bool Success { get; set; }
    public string? AudioBase64 { get; set; }  // Base64 encoded audio data
    public string? Error { get; set; }
    public int? FileSizeBytes { get; set; }
    public double? DurationSeconds { get; set; }
    public int? TextLength { get; set; }
}
