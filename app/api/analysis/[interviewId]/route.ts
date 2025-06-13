import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { readFile } from 'fs/promises';
import { ensureTmpAnalysisDirectory } from '@/utils/tmp';

export async function GET(
  request: NextRequest,
  { params }: { params: { interviewId: string } }
) {
  try {
    const resolvedParams = await params;
    const interviewId = resolvedParams.interviewId;
    
    // Ensure tmp/analysis directory exists
    await ensureTmpAnalysisDirectory();
    const analysisPath = path.join(process.cwd(), 'tmp', 'analysis', `${interviewId}_analysis.json`);
    
    try {
      const content = await readFile(analysisPath, 'utf-8');
      const analysis = JSON.parse(content);
      return NextResponse.json(analysis);
    } catch (error) {
      console.log('Analysis file not found, generating scores...');
      
      // Generate scores by calling the score API
      const scoreResponse = await fetch(`${request.nextUrl.origin}/api/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interviewId }),
      });

      if (!scoreResponse.ok) {
        throw new Error('Failed to generate scores');
      }

      const analysis = await scoreResponse.json();
      return NextResponse.json(analysis);
    }
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return NextResponse.json({ 
      error: 'Internal Server Error',
      message: 'An unexpected error occurred while fetching the analysis.'
    }, { status: 500 });
  }
} 