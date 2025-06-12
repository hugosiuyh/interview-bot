import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Mock processing delay to simulate real transcription
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock transcript responses - in real implementation, this would call Whisper
    const mockTranscripts = [
      [
        { start: "00:00:00", end: "00:00:08", text: "I applied to Momentum because I'm passionate about helping others achieve their goals and I believe in the power of coaching." },
        { start: "00:00:08", end: "00:00:15", text: "I have experience managing multiple projects and I'm confident I can handle 6-12 weekly sessions effectively." }
      ],
      [
        { start: "00:00:00", end: "00:00:10", text: "I chose Momentum because your company's mission aligns with my values of personal growth and development." },
        { start: "00:00:10", end: "00:00:18", text: "For managing multiple sessions, I would use a structured scheduling system and prioritize clear communication." }
      ],
      [
        { start: "00:00:00", end: "00:00:12", text: "Momentum's focus on empowering individuals really resonates with me, and I want to be part of that impact." },
        { start: "00:00:12", end: "00:00:20", text: "I'd manage the workload by creating detailed session plans and maintaining organized client records." }
      ]
    ];

    // Random selection for variety
    const randomTranscript = mockTranscripts[Math.floor(Math.random() * mockTranscripts.length)];
    
    return NextResponse.json(randomTranscript);
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
  }
} 