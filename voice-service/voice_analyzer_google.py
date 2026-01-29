"""
Voice Analysis Service - ULTRA SIMPLE VERSION
Uses Google Speech Recognition API (no model download needed)
Converts WebM to WAV first
"""

import sys
import json
import speech_recognition as sr
from pathlib import Path
from pydub import AudioSegment
import os


def transcribe_audio(audio_path):
    """Transcribe audio using Google Speech Recognition"""
    try:
        # Convert WebM to WAV if needed
        audio_path_str = str(audio_path)
        wav_path = audio_path_str
        
        if audio_path_str.endswith('.webm'):
            print(f"Converting WebM to WAV...", file=sys.stderr)
            # Load webm and convert to wav
            audio = AudioSegment.from_file(audio_path_str, format="webm")
            wav_path = audio_path_str.replace('.webm', '.wav')
            audio.export(wav_path, format="wav")
            print(f"Converted to: {wav_path}", file=sys.stderr)
        
        recognizer = sr.Recognizer()
        
        # Load audio file
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
        
        # Transcribe using Google
        print(f"Transcribing...", file=sys.stderr)
        transcript = recognizer.recognize_google(audio_data)
        
        # Clean up converted file if we created one
        if wav_path != audio_path_str and os.path.exists(wav_path):
            os.remove(wav_path)
        
        return {
            "success": True,
            "transcript": transcript,
            "confidence_score": 70
        }
    except sr.UnknownValueError:
        return {
            "success": False,
            "error": "Could not understand audio"
        }
    except sr.RequestError as e:
        return {
            "success": False,
            "error": f"Google Speech Recognition error: {e}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


def main():
    """CLI entry point"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python voice_analyzer.py <audio_file_path>"
        }))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    
    # Check if file exists
    if not Path(audio_path).exists():
        print(json.dumps({
            "success": False,
            "error": f"Audio file not found: {audio_path}"
        }))
        sys.exit(1)
    
    # Transcribe audio
    result = transcribe_audio(audio_path)
    
    # Output JSON to stdout
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
