import { NextRequest, NextResponse } from 'next/server';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';
import OpenAI from 'openai';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: NextRequest) {
  let tempInputPath: string | null = null;
  let tempOutputPath: string | null = null;

  try {
    const formData = await request.formData();
    const video = formData.get('video') as File;
    const interviewId = formData.get('interviewId') as string;

    if (!video || !interviewId) {
      return NextResponse.json(
        { error: 'Video and interviewId are required' },
        { status: 400 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Create temp directory
    const tempDir = path.join(process.cwd(), 'temp');
    await mkdir(tempDir, { recursive: true });

    // Save video file
    const videoBuffer = Buffer.from(await video.arrayBuffer());
    const videoPath = path.join(uploadsDir, `interview_${interviewId}.webm`);
    await writeFile(videoPath, videoBuffer);

    // Save temp input file
    tempInputPath = path.join(tempDir, `input-${Date.now()}.webm`);
    await writeFile(tempInputPath, videoBuffer);

    // Convert to MP3
    tempOutputPath = path.join(tempDir, `output-${Date.now()}.mp3`);
    console.log('Converting video to MP3...');
    await execAsync(`ffmpeg -i ${tempInputPath} -vn -acodec libmp3lame -ar 16000 -ac 1 ${tempOutputPath}`);

    // Read the converted MP3 file
    const audioBuffer = await require('fs').promises.readFile(tempOutputPath);
    const audioFile = new File([audioBuffer], 'audio.mp3', { type: 'audio/mp3' });

    console.log('Transcribing complete interview...');
    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: audioFile,
      response_format: "verbose_json",
      timestamp_granularities: ["segment", "word"],
      prompt: "This is an interview conversation between an AI interviewer and a job candidate."
    });

    // Save transcription to file
    const transcriptionPath = path.join(uploadsDir, `interview_${interviewId}_transcription.json`);
    await writeFile(transcriptionPath, JSON.stringify(transcription, null, 2));

    return NextResponse.json({ 
      success: true,
      transcription 
    });
  } catch (error) {
    console.error('Error handling video upload:', error);
    return NextResponse.json(
      { error: 'Failed to process video upload' },
      { status: 500 }
    );
  } finally {
    // Cleanup temp files
    try {
      if (tempInputPath) await unlink(tempInputPath);
      if (tempOutputPath) await unlink(tempOutputPath);
    } catch (e) {
      console.error('Error cleaning up temp files:', e);
    }
  }
} 