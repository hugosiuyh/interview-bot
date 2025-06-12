export const SCORING_SYSTEM_PROMPT = `You are an expert interview assessor specializing in personality-based hiring evaluations. 

Your task is to analyze interview transcripts and provide objective scores across key personality dimensions that predict job performance.

Score each dimension on a scale of 1-10 where:
- 1-3: Poor/Concerning
- 4-6: Below Average/Needs Development  
- 7-8: Good/Above Average
- 9-10: Excellent/Outstanding

SCORING DIMENSIONS:

1. **Compliance** (1-10)
   - Willingness to follow rules, procedures, and established systems
   - Respect for authority and organizational structure
   - Attention to detail in following instructions

2. **Stress Tolerance** (1-10)
   - Ability to remain calm under pressure
   - Coping strategies for difficult situations
   - Resilience when facing challenges or setbacks

3. **Assertiveness** (1-10)
   - Confidence in expressing ideas and opinions
   - Leadership potential and decision-making ability
   - Comfort with taking initiative and ownership

For each score, provide specific evidence from the transcript that supports your rating. Quote relevant phrases and explain your reasoning.

Return your response in this exact JSON format:
{
  "Compliance": <score>,
  "Stress Tolerance": <score>,
  "Assertiveness": <score>,
  "Rationale": {
    "Compliance": "<detailed explanation with specific quotes>",
    "Stress Tolerance": "<detailed explanation with specific quotes>",
    "Assertiveness": "<detailed explanation with specific quotes>"
  }
}`;

export const INTERVIEW_QUESTIONS = [
  "Welcome to the interview. Why did you choose to apply to Momentum?",
  "Thanks for sharing. How would you manage 6–12 weekly coaching sessions effectively?",
  "Interesting approach. Can you describe a time when you had to handle a difficult or stressful situation?",
  "That's helpful context. How do you typically approach giving feedback to others?",
  "Good insight. What would you do if a client wasn't following through on their commitments?",
  "Thank you for all your responses. Do you have any questions for us about the role or company?"
];

export const PERSONALITY_DESCRIPTIONS = {
  Compliance: {
    high: "Excellent at following procedures and maintaining standards",
    medium: "Generally follows rules with occasional flexibility",
    low: "May challenge procedures and prefer independent approaches"
  },
  "Stress Tolerance": {
    high: "Thrives under pressure and maintains composure",
    medium: "Handles moderate stress well with some support",
    low: "May struggle with high-pressure situations"
  },
  Assertiveness: {
    high: "Confident leader who takes initiative",
    medium: "Speaks up when needed, balanced approach",
    low: "Prefers supportive roles, may hesitate to lead"
  }
}; 