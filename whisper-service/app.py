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

import os
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
import subprocess
from openai import OpenAI

app = Flask(__name__)
CORS(app)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

@app.route('/health')
def health():
    return jsonify({"status": "healthy", "service": "openai-transcription"})

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        if 'audio' not in request.files and 'video' not in request.files:
            return jsonify({"error": "No audio or video file provided"}), 400

        file = request.files.get('audio') or request.files.get('video')
        file_ext = os.path.splitext(file.filename)[1].lower()

        # Create temp directory for processing
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = os.path.join(temp_dir, f"input{file_ext}")
            audio_path = os.path.join(temp_dir, "audio.mp3")
            
            # Save uploaded file
            file.save(input_path)

            # If it's a video file, extract audio
            if file_ext in ['.webm', '.mp4', '.mov']:
                print(f"Extracting audio from video file: {input_path}")
                # Extract audio using ffmpeg and convert to mp3
                cmd = [
                    'ffmpeg', '-i', input_path,
                    '-vn',  # Disable video
                    '-acodec', 'libmp3lame',  # Convert to MP3
                    '-ar', '16000',  # Set sample rate to 16kHz
                    '-ac', '1',  # Convert to mono
                    '-y',  # Overwrite output file
                    audio_path
                ]
                subprocess.run(cmd, check=True)
            else:
                # For audio files, just convert to mp3
                cmd = [
                    'ffmpeg', '-i', input_path,
                    '-acodec', 'libmp3lame',
                    '-ar', '16000',
                    '-ac', '1',
                    '-y',
                    audio_path
                ]
                subprocess.run(cmd, check=True)

            print("Transcribing audio...")
            
            # Open the audio file
            with open(audio_path, 'rb') as audio_file:
                # Use OpenAI's transcription API
                transcription = client.audio.transcriptions.create(
                    model="gpt-4o-transcribe",
                    file=audio_file,
                    response_format="verbose_json",
                    prompt="This is an interview conversation between an AI interviewer and a job candidate.",
                )

            # Format response with timestamps
            segments = []
            for segment in transcription.segments:
                segments.append({
                    "text": segment.text,
                    "start": segment.start,
                    "end": segment.end,
                    "words": segment.words if hasattr(segment, 'words') else []
                })

            return jsonify(segments)

    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error: {e}")
        return jsonify({"error": f"Failed to process audio: {str(e)}"}), 500
    except Exception as e:
        print(f"Transcription error: {e}")
        return jsonify({"error": f"Failed to transcribe: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001) 