import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

// Define types for OpenAI response
interface Word {
  word: string;
  start: number;
  end: number;
}

interface Segment {
  text: string;
  start: number;
  end: number;
  words: Word[];
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  console.log('[Transcribe API] Received transcription request');
  let tempOutputPath: string | null = null;
  
  try {
    const formData = await request.formData();
    const fileEntry = formData.get('video');
    const interviewId = formData.get('interviewId') as string;
    const questionId = formData.get('questionId') as string;
    const followUpIndex = formData.get('followUpIndex') as string;
    
    if (!fileEntry || !(fileEntry instanceof File)) {
      console.warn('[Transcribe API] No valid video file provided');
      return NextResponse.json({ error: 'No valid video file provided' }, { status: 400 });
    }

    const file = fileEntry as File;
    console.log(`[Transcribe API] Processing file: ${file.size} bytes for ${interviewId}_${questionId}_followup${followUpIndex}`);

    // Create temp directory
    const tempDir = path.join(process.cwd(), 'tmp');
    await mkdir(tempDir, { recursive: true });

    // Create unique filename for this answer
    const uniqueName = `${interviewId || 'unknown'}_${questionId || 'unknown'}_followup${followUpIndex || '0'}`;
    const videoPath = path.join(tempDir, `${uniqueName}.webm`);
    
    // Save the video file permanently (for archival)
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(videoPath, buffer);
    console.log(`[Transcribe API] Saved video: ${videoPath}`);

    // Convert to MP3 for transcription
    tempOutputPath = path.join(tempDir, `${uniqueName}.mp3`);
    
    console.log('[Transcribe API] Converting to MP3...');
    try {
      await execAsync(`ffmpeg -y -i "${videoPath}" -vn -acodec libmp3lame -ar 16000 -ac 1 -b:a 128k "${tempOutputPath}"`);
    } catch (error) {
      console.error('[Transcribe API] FFmpeg MP3 conversion error:', error);
      throw new Error('FFmpeg conversion failed.');
    }

    // Read the converted MP3 file
    const audioBuffer = await require('fs').promises.readFile(tempOutputPath);
    const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mp3' });

    console.log('[Transcribe API] Sending to OpenAI...');
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      response_format: "verbose_json",
      timestamp_granularities: ["segment", "word"],
      prompt: "This is an interview conversation between an AI interviewer and a job candidate. If there is no speech, return 'We did not detect any speech in your response.'"
    }) as { segments: Array<{ text: string; start: number; end: number; words?: Word[] }> };

    // Post-process segments to filter out hallucinations and silence
    console.log('[Transcribe API] Transcription:', transcription);
    let filteredSegments = transcription.segments.filter(s => 
      s.text && s.text.trim().length > 5 && s.text.trim().toLowerCase() !== 'if there is no speech, return an empty string.'
    );
    if (filteredSegments.length === 0) {
      console.log('[Transcribe API] No meaningful speech detected or only hallucinated text.');
    }

    // Save transcript as JSON file
    const transcriptPath = path.join(tempDir, `${uniqueName}.json`);
    const transcriptData = {
      interviewId,
      questionId,
      followUpIndex: parseInt(followUpIndex || '0'),
      videoFile: `${uniqueName}.webm`,
      transcriptFile: `${uniqueName}.json`,
      timestamp: new Date().toISOString(),
      segments: filteredSegments
    };
    await writeFile(transcriptPath, JSON.stringify(transcriptData, null, 2));
    console.log(`[Transcribe API] Saved transcript: ${transcriptPath}`);
    
    return NextResponse.json(filteredSegments);
    
  } catch (error) {
    console.error('[Transcribe API] Error:', error);
    let errorMessage = 'Transcription failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    // Only cleanup the temporary MP3 file, keep the video and transcript
    try {
      if (tempOutputPath) await unlink(tempOutputPath);
    } catch (e) {
      console.error('[Transcribe API] Error cleaning up temp files:', e);
    }
  }
} 