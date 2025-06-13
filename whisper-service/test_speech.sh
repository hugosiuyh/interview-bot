#!/bin/bash

# Generate a test audio file with speech using say command (macOS)
echo "Generating test speech audio file..."
say -o test.aiff "This is a test of the whisper transcription service"

# Convert to WAV format (Whisper expects WAV)
ffmpeg -i test.aiff -ar 16000 -ac 1 test.wav

echo "Testing Whisper Service..."
echo "Sending test audio file..."

# Send the file to the Whisper service
curl -v -X POST \
    -H "Content-Type: multipart/form-data" \
    -F "audio=@test.wav" \
    http://localhost:5001/transcribe

# Clean up
rm test.aiff test.wav 