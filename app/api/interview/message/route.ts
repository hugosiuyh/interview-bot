import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  console.log('[Message API] Received message save request');
  
  try {
    const { interviewId, message } = await request.json();
    
    if (!interviewId || !message) {
      console.warn('[Message API] Missing required fields:', { interviewId: !!interviewId, message: !!message });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log(`[Message API] Processing message for interview ${interviewId}:`, {
      from: message.from,
      questionId: message.questionId,
      textLength: message.text.length,
      timestamp: message.timestamp,
      videoTimestamp: message.videoTimestamp
    });

    // Ensure interview exists or create it
    let interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });

    if (!interview) {
      console.log(`[Message API] Creating new interview with ID ${interviewId}`);
      interview = await prisma.interview.create({
        data: {
          id: interviewId,
          status: 'in_progress'
        }
      });
    }

    // Save message
    console.log('[Message API] Saving message to database');
    const savedMessage = await prisma.message.create({
      data: {
        interviewId,
        from: message.from,
        text: message.text,
        timestamp: new Date(message.timestamp),
        questionId: message.questionId,
        videoTimestamp: message.videoTimestamp,
        audioTimestamp: message.audioTimestamp
      }
    });

    console.log('[Message API] Successfully saved message:', {
      id: savedMessage.id,
      from: savedMessage.from,
      timestamp: savedMessage.timestamp
    });

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('[Message API] Error saving message:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 