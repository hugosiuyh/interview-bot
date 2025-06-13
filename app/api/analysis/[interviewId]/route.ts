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
      console.error('Error reading analysis file:', error);
      return new NextResponse('Analysis not found', { status: 404 });
    }
  } catch (error) {
    console.error('Error fetching analysis:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 