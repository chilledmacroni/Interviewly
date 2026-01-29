"""
Text-to-Speech Service using pyttsx3 (System-based TTS)
Uses Windows SAPI5 for high-quality, accurate speech synthesis
"""

import pyttsx3
import os
import sys

class TTSServicePyttsx3:
    def __init__(self, rate: int = 150, volume: float = 1.0):
        """
        Initialize pyttsx3 TTS engine
        
        Args:
            rate: Speech rate (words per minute). Default 150. Normal is 200.
            volume: Volume level (0.0 to 1.0)
        """
        try:
            print("[TTS-PYTTSX3] Initializing system TTS engine...")
            
            # Initialize pyttsx3 engine
            self.engine = pyttsx3.init()
            
            # Configure speech rate (slower for better clarity)
            self.engine.setProperty('rate', rate)
            
            # Configure volume
            self.engine.setProperty('volume', volume)
            
            # Get available voices
            voices = self.engine.getProperty('voices')
            
            # Try to set a good quality voice (prefer female voice for clarity)
            for voice in voices:
                if 'zira' in voice.name.lower() or 'hazel' in voice.name.lower():
                    self.engine.setProperty('voice', voice.id)
                    print(f"[TTS-PYTTSX3] Using voice: {voice.name}")
                    break
            
            print(f"[TTS-PYTTSX3] OK Engine initialized (rate={rate} wpm, volume={volume})")
        except Exception as e:
            print(f"[TTS-PYTTSX3] ERROR Failed to initialize: {e}")
            raise
    
    def text_to_speech(self, text: str, output_path: str = "output_speech.wav") -> dict:
        """
        Convert text to speech and save as WAV file
        
        Args:
            text: The text to convert to speech
            output_path: Path where the audio file will be saved
            
        Returns:
            dict with success status, file path, and metadata
        """
        try:
            # Validate input
            if not text or len(text.strip()) == 0:
                return {
                    "success": False,
                    "error": "Text is empty",
                    "file_path": None
                }
            
            text = text.strip()
            
            print(f"[TTS-PYTTSX3] Generating speech for: {text[:80]}...")
            
            # Generate speech and save to file
            try:
                self.engine.save_to_file(text, output_path)
                self.engine.runAndWait()
            except RuntimeError as e:
                # Sometimes runAndWait() can fail, retry once
                print(f"[TTS-PYTTSX3] Warning: First attempt failed ({e}), retrying...")
                self.engine = pyttsx3.init()  # Reinitialize
                self.engine.setProperty('rate', 150)
                self.engine.setProperty('volume', 1.0)
                self.engine.save_to_file(text, output_path)
                self.engine.runAndWait()
            
            # Give the system a moment to finish writing the file
            import time
            time.sleep(0.5)
            
            # Verify file was created
            if not os.path.exists(output_path):
                return {
                    "success": False,
                    "error": "Failed to generate audio file",
                    "file_path": None
                }
            
            file_size = os.path.getsize(output_path)
            
            # Estimate duration (rough calculation)
            words = len(text.split())
            rate = self.engine.getProperty('rate')
            duration = (words / rate) * 60  # Convert to seconds
            
            print(f"[TTS-PYTTSX3] OK Speech generated successfully ({file_size} bytes, ~{duration:.1f}s)")
            
            return {
                "success": True,
                "file_path": output_path,
                "file_size": file_size,
                "duration": duration,
                "text_length": len(text),
                "word_count": words
            }
            
        except Exception as e:
            print(f"[TTS-PYTTSX3] ERROR Error generating speech: {e}")
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e),
                "file_path": None
            }

def main():
    """Test the TTS service or handle command-line usage"""
    if len(sys.argv) >= 2:
        # Command line usage: python tts_service_pyttsx3.py "text" [output_file]
        text = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else "test_output_pyttsx3.wav"
    else:
        # Interactive test mode
        text = "Hello, this is your interview assistant using the system voice engine. I'm ready to help you with your technical interview."
        output_file = "test_output_pyttsx3.wav"
    
    print("[TTS-PYTTSX3] Initializing TTS service...")
    tts = TTSServicePyttsx3()
    
    print("[TTS-PYTTSX3] Generating speech...")
    result = tts.text_to_speech(text, output_file)
    
    if result["success"]:
        print(f"\nOK Success! Audio saved to: {result['file_path']}")
        print(f"  File size: {result['file_size']} bytes")
        print(f"  Duration: ~{result['duration']:.1f} seconds")
        print(f"  Text length: {result['text_length']} characters")
        sys.exit(0)  # Success
    else:
        print(f"\nERROR Failed: {result['error']}")
        sys.exit(1)  # Error

if __name__ == "__main__":
    main()
