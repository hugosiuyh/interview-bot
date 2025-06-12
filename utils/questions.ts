export interface InterviewQuestion {
  id: string;
  order: number;
  category: string;
  question: string;
  traits: string[];
  momentumMetrics?: string[];
}

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "q1",
    order: 1,
    category: "motivation",
    question: "Why did you choose to apply to Momentum, and what drew you to a career in counseling?",
    traits: ["Achievement", "Passion/Motivation"],
    momentumMetrics: ["Alignment with organization", "intention"]
  },
  {
    id: "q2", 
    order: 2,
    category: "logistics",
    question: "With 6–12 client sessions per week expected, how would you manage that with your other responsibilities?",
    traits: ["Achievement", "Responsibility", "Time Management"],
    momentumMetrics: ["Has realistic plan", "time commitment"]
  },
  {
    id: "q3",
    order: 3,
    category: "stress_management",
    question: "The beginning can feel overwhelming—new tools, policies, and intake flow. How do you plan to manage that?",
    traits: ["Stress Tolerance", "Planning", "Adaptability"],
    momentumMetrics: ["Managing busy start"]
  },
  {
    id: "q4",
    order: 4,
    category: "diversity",
    question: "We serve clients from diverse age groups and backgrounds. Which populations interest you most, and are there any you'd feel less comfortable working with?",
    traits: ["Extroversion", "Cooperativeness"],
    momentumMetrics: ["Open to diversity", "population fit"]
  },
  {
    id: "q5",
    order: 5,
    category: "compliance",
    question: "How do you feel about our policies around documentation deadlines and diagnosing clients for insurance purposes?",
    traits: ["Competitiveness", "Compliance", "Conscientiousness"],
    momentumMetrics: ["Comfort with policy", "structure", "diagnosing"]
  },
  {
    id: "q6",
    order: 6,
    category: "boundaries",
    question: "Our clinicians don't provide opinion letters and we reserve final decisions for leadership. How do you feel about those expectations?",
    traits: ["Assertiveness", "Compliance", "Judgment"],
    momentumMetrics: ["Accepting of policy decisions", "professional boundaries"]
  },
  {
    id: "q7",
    order: 7,
    category: "growth",
    question: "Tell us about a time you had to ask for help or support at work. What led you to that point, and how did you approach it?",
    traits: ["Assertiveness", "Learning Agility", "Judgment"],
    momentumMetrics: ["Knowing when to escalate", "growth mindset"]
  },
  {
    id: "q8",
    order: 8,
    category: "flexibility",
    question: "At Momentum, you'll encounter things like seeing clients on evenings/weekends, adhering to documentation deadlines, following evolving systems, and sometimes working outside your comfort zone. Can you talk about your flexibility and willingness to say yes to those expectations — and what might limit that?",
    traits: ["Flexibility", "Compliance", "Stress Tolerance", "Responsibility"],
    momentumMetrics: ["Willingness to work evenings/weekends", "Openness to practice policies", "Realistic expectations of agency work"]
  }
];

export const TRAIT_BOUNDARIES = {
  "Compliance": { min: 7, max: 10, weight: 0.9 },
  "Stress Tolerance": { min: 6, max: 10, weight: 0.8 },
  "Assertiveness": { min: 5, max: 8, weight: 0.7 },
  "Flexibility": { min: 7, max: 10, weight: 0.85 },
  "Responsibility": { min: 8, max: 10, weight: 0.9 },
  "Achievement": { min: 6, max: 10, weight: 0.75 },
  "Cooperativeness": { min: 7, max: 10, weight: 0.8 }
};

export const SCORING_EXAMPLES = {
  "Compliance": {
    "1": "Openly questions or rejects policies, shows resistance to following procedures",
    "5": "Generally follows rules but shows some flexibility or questioning of procedures", 
    "10": "Enthusiastically embraces all policies and procedures, values structure and order"
  },
  "Stress Tolerance": {
    "1": "Becomes overwhelmed easily, shows signs of anxiety or panic under pressure",
    "5": "Manages moderate stress adequately but may struggle with high-pressure situations",
    "10": "Thrives under pressure, remains calm and focused in stressful situations"
  },
  "Assertiveness": {
    "1": "Very passive, avoids conflict, rarely speaks up or takes initiative",
    "5": "Speaks up when necessary but may hesitate in leadership situations",
    "10": "Confidently leads discussions, takes charge, comfortable with decision-making"
  }
};

export function getRecommendation(scores: Record<string, number>): {
  recommendation: 'recommend' | 'consider' | 'not_recommended';
  confidence: number;
  reasoning: string;
} {
  let totalScore = 0;
  let totalWeight = 0;
  let criticalFailures = 0;
  
  for (const [trait, score] of Object.entries(scores)) {
    const boundary = TRAIT_BOUNDARIES[trait as keyof typeof TRAIT_BOUNDARIES];
    if (boundary) {
      totalScore += score * boundary.weight;
      totalWeight += boundary.weight;
      
      if (score < boundary.min) {
        criticalFailures++;
      }
    }
  }
  
  const weightedAverage = totalScore / totalWeight;
  
  if (criticalFailures >= 2 || weightedAverage < 6) {
    return {
      recommendation: 'not_recommended',
      confidence: 0.8,
      reasoning: `Multiple critical areas below threshold (${criticalFailures} failures). Weighted average: ${weightedAverage.toFixed(1)}`
    };
  } else if (criticalFailures === 1 || weightedAverage < 7.5) {
    return {
      recommendation: 'consider',
      confidence: 0.7,
      reasoning: `Some concerns but potential for growth. Weighted average: ${weightedAverage.toFixed(1)}`
    };
  } else {
    return {
      recommendation: 'recommend',
      confidence: 0.9,
      reasoning: `Strong fit across all key areas. Weighted average: ${weightedAverage.toFixed(1)}`
    };
  }
} 