import { NextRequest, NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

interface AnalysisResult {
  needsFollowUp: boolean;
  followUpQuestion?: string;
  hasExample: boolean;
  responseLength: number;
  confidence: number;
}

export async function POST(request: NextRequest) {
  console.log('[Analyze API] Received response analysis request');
  
  try {
    const { response, questionId, questionText } = await request.json();
    
    if (!response || !questionId || !questionText) {
      console.warn('[Analyze API] Missing required fields:', { 
        response: !!response, 
        questionId: !!questionId, 
        questionText: !!questionText 
      });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    console.log('[Analyze API] Analyzing response:', {
      questionId,
      responseLength: response.length,
      questionLength: questionText.length
    });

    // If no API key, fallback to mock
    if (!OPENAI_API_KEY) {
      // Simple mock: require follow-up if no example phrase
      const hasExample = /for example|for instance|such as|i remember|one time|when i worked|i had a situation|once i|i dealt with|i handled|i managed|i faced|i encountered|i worked with/i.test(response);
      return NextResponse.json({
        isFollowUp: !hasExample,
        followUpQuestion: !hasExample ? 'Can you give a specific example to illustrate your answer?' : undefined
      });
    }

    // First GPT call for scoring
    const scoringPrompt = `You are an expert interview coach specializing in behavioral interviews. Your role is to evaluate candidate responses.

RESPONSE EVALUATION CHECKLIST:

1. STAR Elements (Score each 0-1):
   - Situation: Clear context and background
   - Task: Specific challenge or responsibility
   - Action: Concrete steps taken
   - Result: Measurable outcome or impact

2. Content Quality (Score each 0-1):
   - Specificity: Concrete details vs vague statements
   - Relevance: Directly addresses the question
   - Depth: Level of detail provided
   - Personalization: Uses "I" statements and personal experience

Question: ${questionText}
Candidate's Answer: ${response}

Analyze the response using the checklist above. A follow-up is ONLY needed if:
- No specific example is provided
- No measurable results are mentioned
- No concrete actions are described
- The response is purely theoretical or general

If the response includes:
- A specific situation
- Concrete actions taken
- Measurable results
- Personal reflection
Then NO follow-up is needed.

Respond with this exact JSON structure:
{
  "isFollowUp": boolean,
  "analysis": {
    "starElements": {
      "situation": number,
      "task": number,
      "action": number,
      "result": number,
      "overallStarScore": number
    },
    "contentQuality": {
      "specificity": number,
      "relevance": number,
      "depth": number,
      "personalization": number,
      "overallContentScore": number
    },
    "hasSpecificExample": boolean,
    "hasMeasurableResults": boolean,
    "hasConcreteActions": boolean,
    "hasPersonalReflection": boolean,
    "keyPoints": string[]
  }
}`;

    const scoringRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are an expert interview coach. Always respond with valid JSON.' },
          { role: 'user', content: scoringPrompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      })
    });

    const scoringData = await scoringRes.json();
    
    // Check for API errors
    if (!scoringData.choices || !scoringData.choices[0] || !scoringData.choices[0].message) {
      console.error('[Analyze API] GPT API error:', scoringData);
      // Use analyzeResponseDepth as fallback
      const analysis = analyzeResponseDepth(response, questionId, questionText);
      return NextResponse.json({
        isFollowUp: analysis.needsFollowUp,
        followUpQuestion: analysis.needsFollowUp ? "Could you provide a specific example to illustrate your point?" : undefined,
        analysis: {
          hasExample: analysis.hasExample,
          hasStar: analysis.confidence > 0.7,
          detailLevel: analysis.responseLength > 200 ? "high" : analysis.responseLength > 100 ? "medium" : "low",
          missingElements: []
        }
      });
    }

    let scoringText = '';
    try {
      scoringText = scoringData.choices[0].message.content.trim();
      scoringText = scoringText.replace(/```json\n?|\n?```/g, '').trim();
      const match = scoringText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          
          // Log the analysis for debugging
          console.log('[Analyze API] Response analysis:', {
            isFollowUp: parsed.isFollowUp,
            analysis: parsed.analysis
          });
          
          // If follow-up is needed, make a second GPT call for the question
          if (parsed.isFollowUp) {
            const questionPrompt = `You are an expert interview coach. Generate a follow-up question that:
1. Acknowledges what was said in the response
2. Shows active listening
3. Asks for a specific example or more details
4. Maintains a conversational and empathetic tone

Question: ${questionText}
Candidate's Answer: ${response}
Analysis: ${JSON.stringify(parsed.analysis)}

Respond with this exact JSON structure:
{
  "followUpQuestion": string
}`;

            const questionRes = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                  { role: 'system', content: 'You are an expert interview coach. Always respond with valid JSON.' },
                  { role: 'user', content: questionPrompt }
                ],
                temperature: 0.7,
                max_tokens: 200
              })
            });

            const questionData = await questionRes.json();
            
            // Check for API errors
            if (!questionData.choices || !questionData.choices[0] || !questionData.choices[0].message) {
              console.error('[Analyze API] GPT API error for follow-up question:', questionData);
              parsed.followUpQuestion = "Could you provide a specific example to illustrate your point?";
            } else {
              let followUpQuestionText = '';
              try {
                followUpQuestionText = questionData.choices[0].message.content.trim();
                followUpQuestionText = followUpQuestionText.replace(/```json\n?|\n?```/g, '').trim();
                const questionMatch = followUpQuestionText.match(/\{[\s\S]*\}/);
                if (questionMatch) {
                  const questionParsed = JSON.parse(questionMatch[0]);
                  parsed.followUpQuestion = questionParsed.followUpQuestion;
                }
              } catch (questionError) {
                console.error('[Analyze API] Error processing follow-up question:', questionError);
                parsed.followUpQuestion = "Could you provide a specific example to illustrate your point?";
              }
            }
          }
          
          return NextResponse.json({
            isFollowUp: parsed.isFollowUp,
            followUpQuestion: parsed.isFollowUp ? parsed.followUpQuestion : undefined,
            analysis: parsed.analysis
          });
        } catch (parseError) {
          console.error('[Analyze API] JSON parse error:', parseError);
          console.error('[Analyze API] Raw GPT response:', scoringText);
          
          // Use analyzeResponseDepth instead of hardcoded fallback
          const analysis = analyzeResponseDepth(response, questionId, questionText);
          return NextResponse.json({
            isFollowUp: analysis.needsFollowUp,
            followUpQuestion: analysis.needsFollowUp ? "Could you provide a specific example to illustrate your point?" : undefined,
            analysis: {
              hasExample: analysis.hasExample,
              hasStar: analysis.confidence > 0.7,
              detailLevel: analysis.responseLength > 200 ? "high" : analysis.responseLength > 100 ? "medium" : "low",
              missingElements: []
            }
          });
        }
      }
    } catch (e) {
      console.error('[Analyze API] Error processing GPT response:', e);
      // Use analyzeResponseDepth instead of hardcoded fallback
      const analysis = analyzeResponseDepth(response, questionId, questionText);
      return NextResponse.json({
        isFollowUp: analysis.needsFollowUp,
        followUpQuestion: analysis.needsFollowUp ? "Could you provide a specific example to illustrate your point?" : undefined,
        analysis: {
          hasExample: analysis.hasExample,
          hasStar: analysis.confidence > 0.7,
          detailLevel: analysis.responseLength > 200 ? "high" : analysis.responseLength > 100 ? "medium" : "low",
          missingElements: []
        }
      });
    }

    // Fallback: if GPT response is not valid JSON
    return NextResponse.json({
      isFollowUp: false
    });
  } catch (error) {
    console.error('[Analyze API] Error analyzing response:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}

function analyzeResponseDepth(response: string, questionId: string, questionText: string): AnalysisResult {
  console.log('[Analyze API] Starting depth analysis');
  
  const responseLength = response.trim().length;
  const hasExample = detectExample(response);
  const isDetailed = responseLength >= 100; // Minimum 100 characters for detailed response
  
  // Determine if follow-up is needed based on question type and response quality
  const needsFollowUp = shouldAskFollowUp(response, questionId, hasExample, isDetailed);
  
  return {
    needsFollowUp,
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