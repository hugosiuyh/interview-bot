import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { readFile } from 'fs/promises';
import { ensureTmpDirectory } from '@/utils/tmp';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const resolvedParams = await params;
    const filename = decodeURIComponent(resolvedParams.filename);
    // Remove any /api/videos/ prefix if it exists
    const cleanFilename = filename.replace(/^\/api\/videos\//, '');
    
    // Ensure tmp directory exists
    await ensureTmpDirectory();
    const filePath = join(process.cwd(), 'tmp', cleanFilename);

    // Read the entire file into memory
    const videoBuffer = await readFile(filePath);

    // Set appropriate headers
    const headers = new Headers();
    headers.set('Content-Type', 'video/webm; codecs=vp8,opus');
    headers.set('Content-Length', videoBuffer.length.toString());
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', 'public, max-age=31536000');

    // Return the video buffer directly
    return new NextResponse(videoBuffer, { headers });
  } catch (error) {
    console.error('Error serving video:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 