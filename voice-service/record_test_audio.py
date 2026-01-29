"""
Record a test audio file using your microphone
This creates a real speech sample for testing the voice analyzer
"""

import sounddevice as sd
import soundfile as sf
import numpy as np
import sys

def record_audio(filename="test_speech.wav", duration=10, sample_rate=16000):
    """
    Record audio from microphone
    
    Args:
        filename: Output filename
        duration: Recording duration in seconds
        sample_rate: Audio sample rate (16000 Hz recommended for speech)
    """
    print("=" * 60)
    print("VOICE RECORDER - Test Audio for Voice Analyzer")
    print("=" * 60)
    print(f"\nRecording will start in 2 seconds...")
    print(f"Duration: {duration} seconds")
    print(f"\nSuggested test phrase:")
    print('  "I have experience with React, Node.js, and Python."')
    print('  "I worked on a project that involved machine learning."')
    print("\nSpeak clearly and naturally...")
    print("-" * 60)
    
    # Countdown
    import time
    for i in range(2, 0, -1):
        print(f"Starting in {i}...", end='\r')
        time.sleep(1)
    
    print("\n🎤 RECORDING... Speak now!")
    print("-" * 60)
    
    try:
        # Record audio
        audio = sd.rec(
            int(duration * sample_rate),
            samplerate=sample_rate,
            channels=1,
            dtype='float32'
        )
        sd.wait()  # Wait until recording is finished
        
        print("✓ Recording complete!")
        
        # Save to file
        sf.write(filename, audio, sample_rate)
        print(f"✓ Audio saved to: {filename}")
        print(f"\nNow test with:")
        print(f"  python voice_analyzer.py {filename}")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        print("\nNote: This requires a microphone.")
        print("Alternative: Use your phone/computer to record and save as WAV")
        sys.exit(1)

if __name__ == "__main__":
    try:
        import sounddevice
        record_audio()
    except ImportError:
        print("Installing sounddevice for microphone recording...")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "sounddevice"])
        print("\nRun the script again: python record_test_audio.py")
