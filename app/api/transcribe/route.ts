import { NextRequest, NextResponse } from 'next/server';

const WHISPER_SERVICE_URL = process.env.WHISPER_SERVICE_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  console.log('[Transcribe API] Received transcription request');
  
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      console.warn('[Transcribe API] No audio file provided');
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    console.log(`[Transcribe API] Processing audio file: ${audioFile.size} bytes`);

    // Forward the audio file to the Whisper service
    const whisperFormData = new FormData();
    whisperFormData.append('audio', audioFile);

    console.log(`[Transcribe API] Sending request to Whisper service at ${WHISPER_SERVICE_URL}`);
    
    const response = await fetch(`${WHISPER_SERVICE_URL}/transcribe`, {
      method: 'POST',
      body: whisperFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[Transcribe API] Whisper service error:', error);
      throw new Error(error.error || 'Transcription service error');
    }

    const transcript = await response.json();
    console.log('[Transcribe API] Successfully received transcript:', 
      transcript.map((t: any) => ({ 
        text: t.text.substring(0, 50) + (t.text.length > 50 ? '...' : ''),
        duration: t.end - t.start 
      }))
    );
    
    return NextResponse.json(transcript);
    
  } catch (error) {
    console.error('[Transcribe API] Error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
} 