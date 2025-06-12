import { NextRequest, NextResponse } from 'next/server';

interface AnalysisResult {
  needsFollowUp: boolean;
  followUpQuestion?: string;
  hasExample: boolean;
  responseLength: number;
  confidence: number;
}

export async function POST(request: NextRequest) {
  try {
    const { response, questionId, questionText } = await request.json();
    
    if (!response || !questionId || !questionText) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Analyze response depth
    const analysis = analyzeResponseDepth(response, questionId, questionText);
    
    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

function analyzeResponseDepth(response: string, questionId: string, questionText: string): AnalysisResult {
  const responseLength = response.trim().length;
  const hasExample = detectExample(response);
  const isDetailed = responseLength >= 100; // Minimum 100 characters for detailed response
  
  // Determine if follow-up is needed based on question type and response quality
  const needsFollowUp = shouldAskFollowUp(response, questionId, hasExample, isDetailed);
  
  let followUpQuestion = '';
  if (needsFollowUp) {
    followUpQuestion = generateFollowUpQuestion(questionId, response, hasExample);
  }
  
  return {
    needsFollowUp,
    followUpQuestion,
    hasExample,
    responseLength,
    confidence: calculateConfidence(response, hasExample, isDetailed)
  };
}

function detectExample(response: string): boolean {
  const exampleIndicators = [
    'for example', 'for instance', 'such as', 'like when', 'one time',
    'i remember', 'there was a time', 'in my experience', 'at my previous',
    'when i worked', 'i had a situation', 'once i', 'i dealt with',
    'i handled', 'i managed', 'i faced', 'i encountered', 'i worked with'
  ];
  
  const responseWords = response.toLowerCase();
  return exampleIndicators.some(indicator => responseWords.includes(indicator));
}

function shouldAskFollowUp(response: string, questionId: string, hasExample: boolean, isDetailed: boolean): boolean {
  // Don't ask follow-up if response already has a good example and is detailed
  if (hasExample && isDetailed) {
    return false;
  }
  
  // Question-specific logic
  const followUpTriggers = {
    'q1': !hasExample, // Motivation questions need specific examples
    'q2': !hasExample, // Time management needs concrete strategies
    'q3': !hasExample, // Stress management needs specific scenarios
    'q4': response.length < 50, // Diversity questions need detailed preferences
    'q5': response.length < 80, // Policy questions need detailed comfort level
    'q6': response.length < 80, // Boundary questions need clear stance
    'q7': !hasExample, // Help-seeking questions must have examples
    'q8': !hasExample // Flexibility questions need specific examples
  };
  
  return followUpTriggers[questionId as keyof typeof followUpTriggers] || false;
}

function generateFollowUpQuestion(questionId: string, response: string, hasExample: boolean): string {
  const followUpQuestions = {
    'q1': [
      "Can you give me a specific example of what drew you to counseling?",
      "What particular experience or moment made you realize this was the right career path?",
      "Can you share a specific situation where you felt passionate about helping others?"
    ],
    'q2': [
      "Can you walk me through how you would organize a typical week with 8-10 sessions?",
      "Give me an example of how you've managed multiple responsibilities before.",
      "What specific strategies would you use to maintain work-life balance?"
    ],
    'q3': [
      "Can you describe a specific time when you felt overwhelmed and how you handled it?",
      "What would be your first step if you realized you were falling behind on documentation?",
      "Give me an example of how you've learned complex procedures quickly in the past."
    ],
    'q4': [
      "Can you be more specific about which age groups you feel most comfortable with?",
      "Are there any specific populations you'd prefer to avoid, and why?",
      "Give me an example of working with someone very different from yourself."
    ],
    'q5': [
      "How do you typically feel about strict deadlines in general?",
      "Can you give me an example of following detailed procedures in a previous role?",
      "What's your experience with insurance requirements or similar regulatory work?"
    ],
    'q6': [
      "Can you give me an example of a time when you disagreed with a supervisor's decision?",
      "How do you typically handle situations where you can't make the final call?",
      "Describe a time when you had to follow policies you didn't fully understand."
    ],
    'q7': [
      "What was the specific situation that led you to ask for help?",
      "How did you know it was the right time to reach out?",
      "Can you describe exactly how you approached asking for support?"
    ],
    'q8': [
      "Can you give me a specific example of working outside your comfort zone?",
      "Describe a time when you had to adapt to changing requirements quickly.",
      "What would you do if asked to work a weekend you hadn't planned for?"
    ]
  };
  
  const questions = followUpQuestions[questionId as keyof typeof followUpQuestions] || [
    "Can you provide a specific example to illustrate your point?",
    "Could you elaborate on that with a concrete situation you've experienced?",
    "Can you give me more details about how you would handle this?"
  ];
  
  // Choose follow-up based on what's missing
  if (!hasExample && response.length < 50) {
    return questions[0]; // Ask for specific example
  } else if (!hasExample) {
    return questions[1]; // Ask for concrete situation
  } else {
    return questions[2]; // Ask for more details
  }
}

function calculateConfidence(response: string, hasExample: boolean, isDetailed: boolean): number {
  let confidence = 0.5; // Base confidence
  
  if (hasExample) confidence += 0.3;
  if (isDetailed) confidence += 0.2;
  if (response.split(' ').length > 50) confidence += 0.1; // Very detailed response
  
  // Check for vague responses
  const vagueIndicators = ['i guess', 'maybe', 'probably', 'i think', 'kind of', 'sort of'];
  const hasVagueLanguage = vagueIndicators.some(indicator => 
    response.toLowerCase().includes(indicator)
  );
  
  if (hasVagueLanguage) confidence -= 0.2;
  
  return Math.max(0.1, Math.min(1.0, confidence));
} 