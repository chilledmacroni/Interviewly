"""
Voice Analysis Service - FULL ANALYSIS VERSION
Uses faster-whisper for transcription + comprehensive voice analysis:
- Transcription (faster-whisper with int8)
- Sentiment analysis (confidence, tone)
- Speech pace analysis
- Filler words detection
- Voice quality metrics
"""

import sys
import json
import warnings
from pathlib import Path
import re

# Suppress warnings
warnings.filterwarnings('ignore')

try:
    from faster_whisper import WhisperModel
    from pydub import AudioSegment
    import librosa
    import numpy as np
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
    import os
except ImportError as e:
    print(json.dumps({
        "error": f"Missing dependency: {str(e)}",
        "success": False
    }))
    sys.exit(1)


class VoiceAnalyzer:
    """Comprehensive voice analysis for interview evaluation"""
    
    # Class-level caches
    _model = None
    _sentiment_analyzer = None
    
    # Common filler words
    FILLER_WORDS = {
        'um', 'uh', 'umm', 'uhh', 'like', 'you know', 'sort of', 'kind of',
        'basically', 'actually', 'literally', 'right', 'okay', 'so', 'well',
        'i mean', 'you see', 'anyway', 'yeah'
    }
    
    def __init__(self):
        """Initialize models"""
        if VoiceAnalyzer._model is None:
            print("Loading faster-whisper tiny model...", file=sys.stderr)
            VoiceAnalyzer._model = WhisperModel(
                "tiny",
                device="cpu",
                compute_type="int8",
                num_workers=2
            )
            print("Whisper loaded!", file=sys.stderr)
        
        if VoiceAnalyzer._sentiment_analyzer is None:
            VoiceAnalyzer._sentiment_analyzer = SentimentIntensityAnalyzer()
        
        self.model = VoiceAnalyzer._model
        self.sentiment_analyzer = VoiceAnalyzer._sentiment_analyzer
    
    def analyze(self, audio_path):
        """Full voice analysis"""
        try:
            # Convert WebM to WAV
            audio_path_str = str(audio_path)
            wav_path = audio_path_str
            
            if audio_path_str.endswith('.webm'):
                print("Converting WebM to WAV...", file=sys.stderr)
                audio = AudioSegment.from_file(audio_path_str, format="webm")
                wav_path = audio_path_str.replace('.webm', '.wav')
                audio.export(wav_path, format="wav")
            
            # 1. TRANSCRIPTION
            print("Transcribing...", file=sys.stderr)
            segments, info = self.model.transcribe(
                wav_path,
                beam_size=1,
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=500,
                    speech_pad_ms=400
                ),
                language="en",
                without_timestamps=False  # Need timestamps for pace analysis
            )
            
            # Collect segments with timestamps
            all_segments = []
            transcript_parts = []
            
            for segment in segments:
                all_segments.append({
                    'text': segment.text,
                    'start': segment.start,
                    'end': segment.end
                })
                transcript_parts.append(segment.text)
            
            transcript = " ".join(transcript_parts).strip()
            
            if not transcript:
                return {
                    "success": False,
                    "error": "No speech detected"
                }
            
            # 2. FILLER WORDS ANALYSIS
            filler_analysis = self._analyze_filler_words(transcript)
            clean_transcript = filler_analysis['clean_transcript']
            
            # 3. SENTIMENT ANALYSIS (Confidence indicators)
            sentiment_scores = self.sentiment_analyzer.polarity_scores(transcript)
            
            # 4. SPEECH PACE ANALYSIS
            pace_analysis = self._analyze_speech_pace(all_segments, wav_path)
            
            # 5. VOICE QUALITY ANALYSIS
            voice_quality = self._analyze_voice_quality(wav_path)
            
            # Clean up WAV file
            if wav_path != audio_path_str and os.path.exists(wav_path):
                os.remove(wav_path)
            
            # 6. CALCULATE CONFIDENCE SCORE
            confidence_score = self._calculate_confidence_score(
                sentiment_scores,
                filler_analysis,
                pace_analysis,
                voice_quality
            )
            
            print(f"Transcript: {transcript[:100]}...", file=sys.stderr)
            print(f"Confidence Score: {confidence_score}", file=sys.stderr)
            
            return {
                "success": True,
                "transcript": transcript,
                "clean_transcript": clean_transcript,
                "confidence_score": confidence_score,
                "analysis": {
                    "filler_words": {
                        "count": filler_analysis['filler_count'],
                        "percentage": filler_analysis['filler_percentage'],
                        "found": filler_analysis['fillers_found']
                    },
                    "sentiment": {
                        "positive": sentiment_scores['pos'],
                        "neutral": sentiment_scores['neu'],
                        "negative": sentiment_scores['neg'],
                        "compound": sentiment_scores['compound']
                    },
                    "speech_pace": {
                        "words_per_minute": pace_analysis['wpm'],
                        "pace_rating": pace_analysis['pace_rating']
                    },
                    "voice_quality": {
                        "pitch_variation": voice_quality['pitch_variation'],
                        "energy_level": voice_quality['energy_level'],
                        "clarity_score": voice_quality['clarity_score']
                    }
                }
            }
            
        except Exception as e:
            print(f"Error: {str(e)}", file=sys.stderr)
            return {
                "success": False,
                "error": str(e)
            }
    
    def _analyze_filler_words(self, transcript):
        """Detect and count filler words"""
        transcript_lower = transcript.lower()
        words = transcript_lower.split()
        
        filler_count = 0
        fillers_found = {}
        
        # Check for single-word fillers
        for word in words:
            clean_word = re.sub(r'[^\w\s]', '', word)
            if clean_word in self.FILLER_WORDS:
                filler_count += 1
                fillers_found[clean_word] = fillers_found.get(clean_word, 0) + 1
        
        # Check for multi-word fillers
        for filler in ['you know', 'i mean', 'sort of', 'kind of', 'you see']:
            count = transcript_lower.count(filler)
            if count > 0:
                filler_count += count
                fillers_found[filler] = count
        
        # Remove fillers for clean transcript
        clean_text = transcript
        for filler in fillers_found.keys():
            clean_text = re.sub(r'\b' + re.escape(filler) + r'\b', '', clean_text, flags=re.IGNORECASE)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        
        total_words = len(words)
        filler_percentage = (filler_count / total_words * 100) if total_words > 0 else 0
        
        return {
            'filler_count': filler_count,
            'filler_percentage': round(filler_percentage, 2),
            'fillers_found': fillers_found,
            'clean_transcript': clean_text
        }
    
    def _analyze_speech_pace(self, segments, wav_path):
        """Analyze speaking rate"""
        if not segments:
            return {'wpm': 0, 'pace_rating': 'unknown'}
        
        total_words = sum(len(seg['text'].split()) for seg in segments)
        total_duration = segments[-1]['end'] - segments[0]['start']
        
        wpm = (total_words / total_duration * 60) if total_duration > 0 else 0
        
        # Pace rating
        if wpm < 100:
            pace_rating = 'slow'
        elif wpm < 160:
            pace_rating = 'normal'
        elif wpm < 200:
            pace_rating = 'fast'
        else:
            pace_rating = 'very_fast'
        
        return {
            'wpm': round(wpm, 1),
            'pace_rating': pace_rating
        }
    
    def _analyze_voice_quality(self, wav_path):
        """Analyze voice characteristics using librosa"""
        try:
            y, sr = librosa.load(wav_path, sr=None)
            
            # Pitch variation (confidence indicator)
            pitches, magnitudes = librosa.piptrack(y=y, sr=sr)
            pitch_values = []
            for t in range(pitches.shape[1]):
                index = magnitudes[:, t].argmax()
                pitch = pitches[index, t]
                if pitch > 0:
                    pitch_values.append(pitch)
            
            pitch_variation = np.std(pitch_values) if pitch_values else 0
            
            # Energy level (confidence, assertiveness)
            rms = librosa.feature.rms(y=y)[0]
            energy_level = float(np.mean(rms))
            
            # Spectral clarity
            spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
            clarity_score = float(np.mean(spectral_centroid))
            
            return {
                'pitch_variation': round(float(pitch_variation), 2),
                'energy_level': round(energy_level * 100, 2),
                'clarity_score': round(clarity_score / 1000, 2)  # Normalize
            }
        except Exception as e:
            print(f"Voice quality analysis error: {e}", file=sys.stderr)
            return {
                'pitch_variation': 0,
                'energy_level': 0,
                'clarity_score': 0
            }
    
    def _calculate_confidence_score(self, sentiment, filler_analysis, pace, voice_quality):
        """Calculate overall confidence score (0-100)"""
        score = 70  # Base score
        
        # Sentiment impact (-10 to +10)
        if sentiment['compound'] > 0.3:
            score += 10
        elif sentiment['compound'] > 0:
            score += 5
        elif sentiment['compound'] < -0.3:
            score -= 10
        elif sentiment['compound'] < 0:
            score -= 5
        
        # Filler words impact (-15 to 0)
        if filler_analysis['filler_percentage'] < 2:
            score += 5
        elif filler_analysis['filler_percentage'] < 5:
            pass  # No change
        elif filler_analysis['filler_percentage'] < 10:
            score -= 5
        else:
            score -= 15
        
        # Pace impact (-5 to +5)
        if pace['pace_rating'] == 'normal':
            score += 5
        elif pace['pace_rating'] in ['slow', 'very_fast']:
            score -= 5
        
        # Voice quality impact (0 to +10)
        if voice_quality['pitch_variation'] > 50:
            score += 5  # Good variation = engaged
        if voice_quality['energy_level'] > 5:
            score += 5  # Good energy = confident
        
        # Clamp to 0-100
        return max(0, min(100, round(score)))


def main():
    """CLI entry point"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "success": False,
            "error": "Usage: python voice_analyzer.py <audio_file_path>"
        }))
        sys.exit(1)
    
    audio_path = sys.argv[1]
    
    if not Path(audio_path).exists():
        print(json.dumps({
            "success": False,
            "error": f"Audio file not found: {audio_path}"
        }))
        sys.exit(1)
    
    analyzer = VoiceAnalyzer()
    result = analyzer.analyze(audio_path)
    
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
