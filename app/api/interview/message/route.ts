import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { interviewId, message } = await request.json();
    
    if (!interviewId || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure interview exists or create it
    let interview = await prisma.interview.findUnique({
      where: { id: interviewId }
    });

    if (!interview) {
      interview = await prisma.interview.create({
        data: {
          id: interviewId,
          status: 'in_progress'
        }
      });
    }

    // Save message
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

    return NextResponse.json(savedMessage);
  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 