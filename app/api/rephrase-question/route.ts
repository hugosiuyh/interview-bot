import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  const { presetQuestion, previousUserMessage } = await request.json();
  console.log(presetQuestion, previousUserMessage);
  const prompt = `
You are an AI interviewer. The previous answer from the candidate was:
"${previousUserMessage}"

Now, rephrase the following interview question to flow naturally from the previous answer, but keep the intent and information the same:
"${presetQuestion}"

Respond with only the reworded question.`;
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
  });
  const reworded = completion.choices[0].message.content?.trim().replace(/^["']|["']$/g, '') || presetQuestion;
  return NextResponse.json({ reworded });
} 