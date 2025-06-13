#!/bin/bash

# Generate a 3-second test audio file
echo "Generating test audio file..."
ffmpeg -f lavfi -i "sine=frequency=1000:duration=3" -ac 1 -ar 16000 test.wav

echo "Testing Whisper Service..."
echo "Sending test audio file..."

# Send the file to the Whisper service
curl -v -X POST \
    -H "Content-Type: multipart/form-data" \
    -F "audio=@test.wav" \
    http://localhost:5001/transcribe

# Clean up
rm test.wav 