# Voice Analysis Service

Python service for analyzing interview audio responses.

## Features
- **Speech-to-Text**: Whisper-small model (OpenAI)
- **Sentiment Analysis**: VADER (optimized for interview context)
- **Filler Word Detection**: Detects "um", "uh", "like", etc.
- **Speaking Pace Analysis**: Calculates words per minute
- **Confidence Scoring**: 0-100 based on multiple factors

## Installation

```bash
# Navigate to voice-service folder
cd voice-service

# Install dependencies
pip install -r requirements.txt
```

**Note**: First run will download models (~1.8 GB total):
- Whisper-small: ~970 MB
- Other dependencies: ~800 MB

## Usage

### Standalone (CLI)
```bash
python voice_analyzer.py path/to/audio.wav
```

### From C# Backend
```csharp
var process = new Process
{
    StartInfo = new ProcessStartInfo
    {
        FileName = "python",
        Arguments = $"voice_analyzer.py {audioPath}",
        RedirectStandardOutput = true,
        UseShellExecute = false,
        CreateNoWindow = true
    }
};
process.Start();
string output = await process.StandardOutput.ReadToEndAsync();
var result = JsonSerializer.Deserialize<VoiceAnalysisResult>(output);
```

## Output Format

```json
{
    "success": true,
    "transcript": "I have experience with React and TypeScript...",
    "confidence_score": 78.5,
    "metrics": {
        "sentiment_score": 0.654,
        "sentiment_label": "positive",
        "filler_count": 3,
        "filler_percentage": 5.2,
        "detected_fillers": ["um", "like"],
        "words_per_minute": 145.3,
        "total_words": 58,
        "pace_rating": "optimal"
    }
}
```

## Confidence Score Breakdown

**Total: 100 points**
- **Sentiment (40%)**: Positive language = higher score
- **Filler Words (30%)**: <5% fillers = full points
- **Speaking Pace (30%)**: 120-160 WPM = optimal

## Supported Audio Formats
- WAV (recommended)
- MP3
- FLAC
- M4A

## Requirements
- Python 3.8+
- ~2 GB disk space (models + dependencies)
- No GPU required (CPU works fine)
