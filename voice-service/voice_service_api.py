"""
Fast Voice Analysis API Server
Keeps models in memory for instant processing
"""

import os
import sys
from flask import Flask, request, jsonify
from voice_analyzer import VoiceAnalyzer

app = Flask(__name__)

# Initialize analyzer once (models stay in memory)
print("Initializing Voice Analyzer service...", file=sys.stderr)
analyzer = VoiceAnalyzer()
print("Service ready!", file=sys.stderr)

@app.route('/analyze', methods=['POST'])
def analyze_audio():
    """Analyze audio file"""
    try:
        # Get file path from request
        data = request.get_json()
        audio_path = data.get('audio_path')
        
        if not audio_path or not os.path.exists(audio_path):
            return jsonify({
                'success': False,
                'error': 'Audio file not found'
            }), 400
        
        # Analyze (fast since models are already loaded)
        result = analyzer.analyze(audio_path)
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Check if service is running"""
    return jsonify({'status': 'healthy', 'models_loaded': True})

if __name__ == '__main__':
    # Run on port 5001 (backend on 5000, frontend on 5173)
    app.run(host='127.0.0.1', port=5001, debug=False)
