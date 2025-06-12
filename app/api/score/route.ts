import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SCORING_EXAMPLES, TRAIT_BOUNDARIES } from '@/utils/questions';
import { SCORING_SYSTEM_PROMPT } from '@/utils/prompts';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  console.log('[Score API] Received scoring request');
  
  try {
    const { transcript, interviewId, candidateName, candidateEmail } = await request.json();
    
    if (!transcript || !interviewId) {
      console.warn('[Score API] Missing required fields:', { 
        transcript: !!transcript, 
        interviewId: !!interviewId 
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[Score API] Processing interview:', {
      interviewId,
      candidateName: candidateName || 'Anonymous',
      transcriptLength: transcript.length
    });

    // Calculate scores
    const scores = calculateScores(transcript);
    console.log('[Score API] Calculated scores:', scores);

    // Update interview record
    console.log('[Score API] Updating interview record');
    const updatedInterview = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        candidateName,
        candidateEmail,
        endTime: new Date(),
        status: 'completed',
        ...scores,
        scores: {
          create: Object.entries(scores).map(([trait, score]) => ({
            trait,
            score: score as number,
            rationale: generateRationale(trait, score as number),
            quotes: JSON.stringify([])
          }))
        }
      }
    });

    console.log('[Score API] Successfully updated interview:', {
      id: updatedInterview.id,
      status: updatedInterview.status,
      scores: Object.entries(scores).map(([trait, score]) => `${trait}: ${score}`)
    });

    return NextResponse.json({
      scores,
      interview: updatedInterview
    });
  } catch (error) {
    console.error('[Score API] Error calculating scores:', error);
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

function calculateScores(transcript: string) {
  console.log('[Score API] Starting score calculation');
  
  // Convert to lowercase for analysis
  const text = transcript.toLowerCase();
  
  // Calculate trait scores
  const complianceScore = calculateComplianceScore(text);
  const stressToleranceScore = calculateStressToleranceScore(text);
  const assertivenessScore = calculateAssertivenessScore(text);
  const flexibilityScore = calculateFlexibilityScore(text);
  const responsibilityScore = calculateResponsibilityScore(text);

  console.log('[Score API] Individual trait scores:', {
    compliance: complianceScore,
    stressTolerance: stressToleranceScore,
    assertiveness: assertivenessScore,
    flexibility: flexibilityScore,
    responsibility: responsibilityScore
  });

  // Calculate overall recommendation
  const avgScore = (
    complianceScore +
    stressToleranceScore +
    assertivenessScore +
    flexibilityScore +
    responsibilityScore
  ) / 5;

  const overallRecommendation = 
    avgScore >= 0.8 ? 'recommend' :
    avgScore >= 0.6 ? 'consider' :
    'not_recommended';

  console.log('[Score API] Overall recommendation:', {
    averageScore: avgScore,
    recommendation: overallRecommendation
  });

  return {
    complianceScore,
    stressToleranceScore,
    assertivenessScore,
    flexibilityScore,
    responsibilityScore,
    overallRecommendation
  };
}

function calculateComplianceScore(text: string): number {
  const positiveIndicators = [
    'follow', 'guideline', 'rule', 'policy', 'procedure',
    'standard', 'regulation', 'requirement', 'protocol',
    'comply', 'compliance', 'adhere', 'accordance'
  ];
  
  const negativeIndicators = [
    'break', 'ignore', 'bypass', 'shortcut', 'skip',
    'avoid', 'circumvent', 'disregard'
  ];

  return calculateTraitScore(text, positiveIndicators, negativeIndicators);
}

function calculateStressToleranceScore(text: string): number {
  const positiveIndicators = [
    'handle', 'manage', 'cope', 'adapt', 'remain calm',
    'pressure', 'deadline', 'challenge', 'difficult',
    'stress', 'balance', 'prioritize'
  ];
  
  const negativeIndicators = [
    'overwhelm', 'anxiety', 'panic', 'stress out',
    'cannot handle', 'too much', 'breakdown'
  ];

  return calculateTraitScore(text, positiveIndicators, negativeIndicators);
}

function calculateAssertivenessScore(text: string): number {
  const positiveIndicators = [
    'lead', 'direct', 'guide', 'initiative', 'decision',
    'confident', 'strong', 'firm', 'clear', 'decisive',
    'advocate', 'speak up'
  ];
  
  const negativeIndicators = [
    'hesitate', 'unsure', 'maybe', 'perhaps', 'might',
    'passive', 'defer', 'avoid conflict'
  ];

  return calculateTraitScore(text, positiveIndicators, negativeIndicators);
}

function calculateFlexibilityScore(text: string): number {
  const positiveIndicators = [
    'adapt', 'adjust', 'change', 'flexible', 'versatile',
    'learn', 'grow', 'improve', 'different', 'various',
    'multiple', 'alternative'
  ];
  
  const negativeIndicators = [
    'rigid', 'fixed', 'unchanging', 'inflexible', 'stuck',
    'always', 'never', 'must', 'only way'
  ];

  return calculateTraitScore(text, positiveIndicators, negativeIndicators);
}

function calculateResponsibilityScore(text: string): number {
  const positiveIndicators = [
    'responsible', 'accountable', 'ownership', 'initiative',
    'reliable', 'dependable', 'consistent', 'thorough',
    'detail', 'organize', 'plan'
  ];
  
  const negativeIndicators = [
    'blame', 'excuse', 'forget', 'late', 'miss',
    'procrastinate', 'careless', 'negligent'
  ];

  return calculateTraitScore(text, positiveIndicators, negativeIndicators);
}

function calculateTraitScore(
  text: string,
  positiveIndicators: string[],
  negativeIndicators: string[]
): number {
  let score = 0.5; // Start at neutral

  // Count positive indicators
  const positiveCount = positiveIndicators.reduce((count, indicator) => {
    const matches = text.split(indicator).length - 1;
    return count + matches;
  }, 0);

  // Count negative indicators
  const negativeCount = negativeIndicators.reduce((count, indicator) => {
    const matches = text.split(indicator).length - 1;
    return count + matches;
  }, 0);

  // Adjust score based on indicators
  if (positiveCount > 0 || negativeCount > 0) {
    const total = positiveCount + negativeCount;
    score = 0.5 + (0.5 * (positiveCount - negativeCount) / total);
  }

  // Ensure score is between 0 and 1
  return Math.min(Math.max(score, 0), 1);
}

function generateRationale(trait: string, score: number): string {
  const strength = 
    score >= 0.8 ? 'strong' :
    score >= 0.6 ? 'moderate' :
    'limited';

  const traitDescriptions: Record<string, Record<string, string>> = {
    complianceScore: {
      strong: 'Demonstrates strong adherence to rules and procedures',
      moderate: 'Shows general respect for guidelines with room for improvement',
      limited: 'May need development in following established protocols'
    },
    stressToleranceScore: {
      strong: 'Exhibits excellent ability to handle pressure and challenges',
      moderate: 'Manages stress adequately but could enhance coping strategies',
      limited: 'Could benefit from stress management techniques'
    },
    assertivenessScore: {
      strong: 'Shows strong leadership qualities and clear communication',
      moderate: 'Demonstrates balanced assertiveness in most situations',
      limited: 'Could develop more confident communication style'
    },
    flexibilityScore: {
      strong: 'Highly adaptable to change and new situations',
      moderate: 'Shows reasonable flexibility with some preferences for routine',
      limited: 'May need support in adapting to changes'
    },
    responsibilityScore: {
      strong: 'Takes full ownership of tasks and outcomes',
      moderate: 'Generally reliable with occasional oversight needed',
      limited: 'Could improve in taking initiative and ownership'
    }
  };

  return traitDescriptions[trait]?.[strength] || 
    'Score indicates areas for potential development';
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