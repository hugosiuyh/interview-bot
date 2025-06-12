#!/usr/bin/env python3
"""
Whisper Transcription Service
A Flask API service for audio transcription using faster-whisper

Usage:
    pip install faster-whisper flask flask-cors
    python app.py

Endpoints:
    POST /transcribe - Upload audio file for transcription
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import tempfile
import os
import logging
from faster_whisper import WhisperModel

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Whisper model
model = WhisperModel("base", device="cpu", compute_type="int8")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "whisper-transcription"})

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """
    Transcribe uploaded audio file
    
    Expected: multipart/form-data with 'audio' file
    Returns: JSON array of transcript segments with timestamps
    """
    try:
        # Check if audio file is present
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        if audio_file.filename == '':
            return jsonify({"error": "No file selected"}), 400

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            audio_file.save(temp_file.name)
            temp_file_path = temp_file.name

        try:
            # Real Whisper transcription
            segments, info = model.transcribe(
                temp_file_path,
                beam_size=5,
                vad_filter=True,
                vad_parameters=dict(
                    min_silence_duration_ms=500,  # Minimum silence duration to split segments
                    speech_pad_ms=400,  # Add padding to speech segments
                )
            )
            
            result = []
            for segment in segments:
                # Format timestamps as seconds from start
                result.append({
                    "start": segment.start,
                    "end": segment.end,
                    "text": segment.text.strip()
                })
            
            logger.info(f"Transcribed audio file: {audio_file.filename}")
            return jsonify(result)

        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)

    except Exception as e:
        logger.error(f"Transcription error: {str(e)}")
        return jsonify({"error": "Transcription failed", "details": str(e)}), 500

@app.route('/models', methods=['GET'])
def list_models():
    """List available Whisper models"""
    return jsonify({
        "available_models": ["tiny", "base", "small", "medium", "large"],
        "current_model": "base",
        "note": "Change model in code based on accuracy vs speed requirements"
    })

if __name__ == '__main__':
    logger.info("Starting Whisper Transcription Service...")
    logger.info("Available endpoints:")
    logger.info("  GET  /health - Health check")
    logger.info("  POST /transcribe - Audio transcription")
    logger.info("  GET  /models - List available models")
    
    app.run(host='0.0.0.0', port=5001, debug=True) 