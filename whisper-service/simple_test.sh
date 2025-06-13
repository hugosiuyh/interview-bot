#!/bin/bash

# Create a small text file to simulate audio data
echo "test data" > test.txt

echo "Testing Whisper Service..."
echo "Sending test file..."

curl -v -X POST \
    -H "Content-Type: multipart/form-data" \
    -F "audio=@test.txt" \
    http://localhost:5001/transcribe

# Clean up
rm test.txt 