import { NextRequest, NextResponse } from 'next/server';
import { SCORING_EXAMPLES, TRAIT_BOUNDARIES, INTERVIEW_QUESTIONS } from '@/utils/questions';
import fs from 'fs/promises';
import path from 'path';
import { ensureTmpAnalysisDirectory } from '@/utils/tmp';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
}

interface TranscriptFile {
  interviewId: string;
  questionId: string;
  followUpIndex: number;
  videoFile: string;
  segments: TranscriptSegment[];
}

export async function POST(request: NextRequest) {
  console.log('[Score API] Received scoring request');
  
  try {
    const { interviewId } = await request.json();
    
    if (!interviewId) {
      console.warn('[Score API] Missing interviewId');
      return NextResponse.json({ error: 'Missing interviewId' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'No OpenAI API key set' }, { status: 500 });
    }

    // Ensure tmp directory exists
    const tmpDir = path.join(process.cwd(), 'tmp');
    console.log('[Score API] Using tmpDir:', tmpDir);
    const files = await fs.readdir(tmpDir);
    console.log('[Score API] Files in tmpDir:', files);
    const transcriptFiles = files.filter(f => 
      f.startsWith(interviewId) && 
      f.endsWith('.json') && 
      !f.includes('analysis')
    );

    // Load all transcript data
    const allTranscripts: TranscriptFile[] = await Promise.all(transcriptFiles.map(async file => {
      const content = await fs.readFile(path.join(tmpDir, file), 'utf-8');
      return JSON.parse(content) as TranscriptFile;
    }));

    console.log('[Score API] Loaded transcript files:', transcriptFiles);
    console.log('[Score API] Loaded questionIds:', allTranscripts.map(t => t.questionId));

    // Get all unique traits from questions
    const allTraits = new Set<string>();
    INTERVIEW_QUESTIONS.forEach(q => {
      q.traits.forEach(t => allTraits.add(t));
      console.log(`[Score API] Question ${q.id} has traits:`, q.traits);
    });
    console.log('[Score API] All traits to process:', Array.from(allTraits));

    // Process each trait
    const traitAnalyses = await Promise.all(Array.from(allTraits).map(async trait => {
      // Gather all relevant segments for this trait
      const relevantSegments: { text: string; start: number; videoFile: string; questionId: string }[] = [];
      for (const transcript of allTranscripts) {
        const question = INTERVIEW_QUESTIONS.find(q => q.id === transcript.questionId);
        if (question?.traits.includes(trait)) {
          for (const seg of transcript.segments) {
            relevantSegments.push({
              text: seg.text,
              start: seg.start,
              videoFile: transcript.videoFile,
              questionId: transcript.questionId
            });
          }
        }
      }
      console.log(`[Score API] Trait '${trait}' relevant segments count:`, relevantSegments.length);
      if (relevantSegments.length === 0) {
        return {
          trait,
          score: null,
          rationale: 'No relevant responses found.',
          quotes: [],
          boundary: TRAIT_BOUNDARIES[trait as keyof typeof TRAIT_BOUNDARIES]
        };
      }

      // Compose prompt for GPT
      const traitDesc = trait + (TRAIT_BOUNDARIES[trait as keyof typeof TRAIT_BOUNDARIES] ? ` (ideal range: ${TRAIT_BOUNDARIES[trait as keyof typeof TRAIT_BOUNDARIES].min}-${TRAIT_BOUNDARIES[trait as keyof typeof TRAIT_BOUNDARIES].max})` : '');
      const questions = INTERVIEW_QUESTIONS.filter(q => q.traits.includes(trait)).map(q => `- ${q.question}`).join('\n');
      const scoringExamples = SCORING_EXAMPLES[trait as keyof typeof SCORING_EXAMPLES];
      const examplesText = scoringExamples ? Object.entries(scoringExamples).map(([score, desc]) => `${score}: ${desc}`).join('\n') : '';
      const quotesText = relevantSegments.map((q, i) => `Quote ${i+1}: "${q.text.trim()}" (start: ${q.start}s, videoFile: ${q.videoFile}, questionId: ${q.questionId})`).join('\n');

      const prompt = `You are an expert interviewer.\n\nTrait: ${traitDesc}\nRelevant Interview Questions:\n${questions}\n\nScoring Examples:\n${examplesText}\n\nBelow are quotes from the candidate's interview responses (with start time and video file).\n\nPlease do the following:\n1. Select up to 3 quotes that are most relevant to this trait.\n2. Assign a score for this trait (1-10, decimals allowed).\n3. Write a rationale for your score, referencing the selected quotes.\n\nRespond in this JSON format:\n{\n  "score": number,\n  "rationale": string,\n  "quotes": [\n    { "text": string, "start": number, "videoFile": string }\n  ]\n}\n\nQuotes:\n${quotesText}\n\nJSON:`;

      // Call OpenAI
      const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are an expert interviewer.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });
      const gptData = await gptRes.json();
      let gptText = '';
      try {
        gptText = gptData.choices[0].message.content.trim();
        // Extract JSON from GPT response
        const match = gptText.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          return {
            trait,
            score: parsed.score,
            rationale: parsed.rationale,
            quotes: parsed.quotes,
            boundary: TRAIT_BOUNDARIES[trait as keyof typeof TRAIT_BOUNDARIES]
          };
        }
      } catch (e) {
        // fallback below
      }
      return {
        trait,
        score: null,
        rationale: 'Could not parse GPT response.',
        quotes: [],
        boundary: TRAIT_BOUNDARIES[trait as keyof typeof TRAIT_BOUNDARIES]
      };
    }));

    // Compose overall summary prompt for GPT
    const summaryPrompt = `You are an expert interviewer.\n\nHere are the trait scores and rationales for a candidate:\n${traitAnalyses.map(t => `${t.trait}: ${t.score}\nRationale: ${t.rationale}`).join('\n\n')}\n\nPlease provide:\n1. A final overall score (1-10)\n2. A recommendation (recommend, consider, not_recommended)\n3. A brief overall rationale\n\nRespond in this JSON format:\n{\n  "finalScore": number,\n  "recommendation": string,\n  "overallRationale": string\n}\n\nJSON:`;

    const summaryRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an expert interviewer.' },
          { role: 'user', content: summaryPrompt }
        ],
        temperature: 0.3,
        max_tokens: 300
      })
    });
    const summaryData = await summaryRes.json();
    let summaryText = '';
    let overall = {};
    try {
      summaryText = summaryData.choices[0].message.content.trim();
      const match = summaryText.match(/\{[\s\S]*\}/);
      if (match) {
        overall = JSON.parse(match[0]);
      }
    } catch (e) {
      overall = { finalScore: null, recommendation: 'error', overallRationale: 'Could not parse GPT response.' };
    }

    // Save the analysis to a JSON file
    const outputDir = await ensureTmpAnalysisDirectory();
    await fs.writeFile(
      path.join(outputDir, `${interviewId}_analysis.json`),
      JSON.stringify({ traits: traitAnalyses, overall }, null, 2)
    );

    console.log('[Score API] Successfully saved analysis:', {
      interviewId,
      traitCount: traitAnalyses.length
    });

    return NextResponse.json({ traits: traitAnalyses, overall });
  } catch (error) {
    console.error('[Score API] Error calculating scores:', error);
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 });
  }
} 