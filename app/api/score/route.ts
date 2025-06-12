import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SCORING_EXAMPLES, TRAIT_BOUNDARIES } from '@/utils/questions';
import { SCORING_SYSTEM_PROMPT } from '@/utils/prompts';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { transcript, interviewId, candidateName, candidateEmail } = await request.json();
    
    if (!transcript) {
      return NextResponse.json({ error: 'No transcript provided' }, { status: 400 });
    }

    // Mock processing delay to simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));

    // TODO: Replace with actual OpenAI API call
    // const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    //   method: "POST",
    //   headers: {
    //     "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    //     "Content-Type": "application/json"
    //   },
    //   body: JSON.stringify({
    //     model: "gpt-4",
    //     messages: [
    //       {
    //         role: "system",
    //         content: SCORING_SYSTEM_PROMPT
    //       },
    //       { role: "user", content: transcript }
    //     ]
    //   })
    // });

    // Enhanced mock scoring based on transcript analysis
    const mockResult = {
      Compliance: generateSmartScore('Compliance', transcript),
      "Stress Tolerance": generateSmartScore('Stress Tolerance', transcript),
      Assertiveness: generateSmartScore('Assertiveness', transcript),
      Flexibility: generateSmartScore('Flexibility', transcript),
      Responsibility: generateSmartScore('Responsibility', transcript),
      Rationale: {
        Compliance: generateRationale('Compliance', transcript),
        "Stress Tolerance": generateRationale('Stress Tolerance', transcript),
        Assertiveness: generateRationale('Assertiveness', transcript),
        Flexibility: generateRationale('Flexibility', transcript),
        Responsibility: generateRationale('Responsibility', transcript)
      },
      timestamp: new Date().toISOString(),
      transcriptAnalyzed: transcript.substring(0, 500) + "..."
    };

    // Save to database if interviewId provided
    if (interviewId) {
      try {
        // Update interview with candidate info and scores
        await prisma.interview.update({
          where: { id: interviewId },
          data: {
            candidateName,
            candidateEmail,
            endTime: new Date(),
            status: 'completed',
            complianceScore: mockResult.Compliance,
            stressToleranceScore: mockResult["Stress Tolerance"],
            assertivenessScore: mockResult.Assertiveness,
            flexibilityScore: mockResult.Flexibility,
            responsibilityScore: mockResult.Responsibility
          }
        });

        // Save individual scores with rationale
        for (const [trait, score] of Object.entries(mockResult)) {
          if (trait !== 'Rationale' && typeof score === 'number') {
            await prisma.score.create({
              data: {
                interviewId,
                trait,
                score,
                                 rationale: mockResult.Rationale[trait as keyof typeof mockResult.Rationale] || '',
                quotes: JSON.stringify(extractQuotes(transcript, trait)),
                confidence: Math.random() * 0.3 + 0.7 // 0.7-1.0 confidence
              }
            });
          }
        }
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Continue even if DB save fails
      }
    }

    return NextResponse.json(mockResult);
  } catch (error) {
    console.error('Scoring error:', error);
    return NextResponse.json({ error: 'Scoring analysis failed' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

function generateSmartScore(trait: string, transcript: string): number {
  const boundary = TRAIT_BOUNDARIES[trait as keyof typeof TRAIT_BOUNDARIES];
  if (!boundary) return Math.floor(Math.random() * 4) + 6; // Default 6-9

  // Basic keyword analysis for more realistic scoring
  const keywords = getTraitKeywords(trait);
  const positiveMatches = keywords.positive.filter(keyword => 
    transcript.toLowerCase().includes(keyword.toLowerCase())
  ).length;
  
  const negativeMatches = keywords.negative.filter(keyword => 
    transcript.toLowerCase().includes(keyword.toLowerCase())
  ).length;

  // Calculate base score with some randomness
  let baseScore = boundary.min + Math.random() * (boundary.max - boundary.min);
  
  // Adjust based on keyword matches
  baseScore += positiveMatches * 0.5;
  baseScore -= negativeMatches * 0.3;
  
  // Clamp to boundaries
  baseScore = Math.max(boundary.min, Math.min(boundary.max, baseScore));
  
  return Math.round(baseScore * 10) / 10; // Round to 1 decimal
}

function generateRationale(trait: string, transcript: string): string {
  const quotes = extractQuotes(transcript, trait);
  const score = generateSmartScore(trait, transcript);
  
  const templates = {
    high: `Strong evidence of ${trait.toLowerCase()}. ${quotes[0] ? `Quote: "${quotes[0]}"` : 'Demonstrates clear capability in this area.'}`,
    medium: `Moderate ${trait.toLowerCase()} shown. ${quotes[0] ? `Quote: "${quotes[0]}"` : 'Shows potential with room for development.'}`,
    low: `Limited evidence of ${trait.toLowerCase()}. May need development in this area.`
  };
  
  if (score >= 8) return templates.high;
  if (score >= 6) return templates.medium;
  return templates.low;
}

function getTraitKeywords(trait: string) {
  const keywordMap: Record<string, { positive: string[], negative: string[] }> = {
    Compliance: {
      positive: ['follow', 'procedure', 'policy', 'guideline', 'structure', 'documentation', 'rule'],
      negative: ['question', 'challenge', 'ignore', 'skip', 'flexible', 'bend']
    },
    'Stress Tolerance': {
      positive: ['calm', 'manage', 'handle', 'cope', 'pressure', 'stressful', 'overcome'],
      negative: ['overwhelmed', 'anxious', 'panic', 'struggle', 'difficult', 'stressed']
    },
    Assertiveness: {
      positive: ['lead', 'confident', 'initiative', 'speak up', 'decision', 'take charge'],
      negative: ['hesitate', 'passive', 'avoid', 'quiet', 'follow', 'uncertain']
    },
    Flexibility: {
      positive: ['adapt', 'change', 'flexible', 'adjust', 'evolving', 'different'],
      negative: ['rigid', 'fixed', 'resistant', 'same', 'routine', 'unchanging']
    },
    Responsibility: {
      positive: ['accountable', 'responsible', 'ownership', 'commitment', 'reliable', 'dependable'],
      negative: ['blame', 'excuse', 'avoid', 'unreliable', 'irresponsible']
    }
  };
  
  return keywordMap[trait] || { positive: [], negative: [] };
}

function extractQuotes(transcript: string, trait: string): string[] {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const keywords = getTraitKeywords(trait);
  
  const relevantSentences = sentences.filter(sentence => 
    keywords.positive.some(keyword => 
      sentence.toLowerCase().includes(keyword.toLowerCase())
    )
  );
  
  return relevantSentences.slice(0, 2).map(s => s.trim());
} 