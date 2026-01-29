"""
Generate a test audio file for testing the voice analyzer
Creates a simple audio tone (beep) that can be analyzed
"""

import numpy as np
import soundfile as sf

def generate_test_audio(filename="test_audio.wav", duration=5):
    """
    Generate a test audio file
    Since we can't generate speech without TTS, we'll create a simple tone
    """
    sample_rate = 16000  # 16 kHz (standard for speech)
    
    # Generate a simple sine wave tone (440 Hz - A note)
    t = np.linspace(0, duration, int(sample_rate * duration), False)
    tone = np.sin(2 * np.pi * 440 * t)
    
    # Add some variation to simulate speech-like patterns
    envelope = np.exp(-t/2)  # Decay envelope
    audio = tone * envelope * 0.3  # Scale down amplitude
    
    # Save as WAV file
    sf.write(filename, audio, sample_rate)
    print(f"✓ Test audio file created: {filename}")
    print(f"  Duration: {duration} seconds")
    print(f"  Sample rate: {sample_rate} Hz")
    print(f"\nNOTE: This is a tone, not speech. For real testing:")
    print("  1. Record yourself saying: 'I have experience with React and Node.js'")
    print("  2. Save as test_speech.wav")
    print("  3. Run: python voice_analyzer.py test_speech.wav")

if __name__ == "__main__":
    generate_test_audio()
