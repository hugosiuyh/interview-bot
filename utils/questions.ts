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
    traits: ["Achievement", "Passion/Motivation", "Cultural Competence"],
    momentumMetrics: ["Alignment with organization", "intention"]
  },
  {
    id: "q2", 
    order: 2,
    category: "logistics",
    question: "With 6–12 client sessions per week expected, how would you manage that with your other responsibilities?",
    traits: ["Achievement", "Responsibility", "Time Management", "Adaptability"],
    momentumMetrics: ["Has realistic plan", "time commitment"]
  },
  {
    id: "q3",
    order: 3,
    category: "stress_management",
    question: "The beginning can feel overwhelming—new tools, policies, and intake flow. How do you plan to manage that?",
    traits: ["Stress Tolerance", "Planning", "Adaptability", "Learning Agility"],
    momentumMetrics: ["Managing busy start"]
  },
  {
    id: "q4",
    order: 4,
    category: "diversity",
    question: "We serve clients from diverse age groups and backgrounds. Which populations interest you most, and are there any you'd feel less comfortable working with?",
    traits: ["Extroversion", "Cooperativeness", "Cultural Competence", "Professional Boundaries"],
    momentumMetrics: ["Open to diversity", "population fit"]
  },
  {
    id: "q5",
    order: 5,
    category: "compliance",
    question: "How do you feel about our policies around documentation deadlines and diagnosing clients for insurance purposes?",
    traits: ["Competitiveness", "Compliance", "Conscientiousness", "Time Management"],
    momentumMetrics: ["Comfort with policy", "structure", "diagnosing"]
  },
  {
    id: "q6",
    order: 6,
    category: "boundaries",
    question: "Our clinicians don't provide opinion letters and we reserve final decisions for leadership. How do you feel about those expectations?",
    traits: ["Assertiveness", "Compliance", "Judgment", "Professional Boundaries"],
    momentumMetrics: ["Accepting of policy decisions", "professional boundaries"]
  },
  {
    id: "q7",
    order: 7,
    category: "growth",
    question: "Tell us about a time you had to ask for help or support at work. What led you to that point, and how did you approach it?",
    traits: ["Assertiveness", "Learning Agility", "Judgment", "Adaptability"],
    momentumMetrics: ["Knowing when to escalate", "growth mindset"]
  },
  {
    id: "q8",
    order: 8,
    category: "flexibility",
    question: "At Momentum, you'll encounter things like seeing clients on evenings/weekends, adhering to documentation deadlines, following evolving systems, and sometimes working outside your comfort zone. Can you talk about your flexibility and willingness to say yes to those expectations — and what might limit that?",
    traits: ["Flexibility", "Compliance", "Stress Tolerance", "Responsibility", "Time Management", "Adaptability"],
    momentumMetrics: ["Willingness to work evenings/weekends", "Openness to practice policies", "Realistic expectations of agency work"]
  }
];

export const TRAIT_BOUNDARIES = {
  "Compliance": { min: 6, max: 10, weight: 0.9 },
  "Stress Tolerance": { min: 5, max: 10, weight: 0.8 },
  "Assertiveness": { min: 4, max: 8, weight: 0.7 },
  "Flexibility": { min: 6, max: 10, weight: 0.85 },
  "Responsibility": { min: 7, max: 10, weight: 0.9 },
  "Achievement": { min: 5, max: 10, weight: 0.75 },
  "Cooperativeness": { min: 6, max: 10, weight: 0.8 },
  "Learning Agility": { min: 5, max: 10, weight: 0.85 },
  "Time Management": { min: 6, max: 10, weight: 0.9 },
  "Professional Boundaries": { min: 6, max: 10, weight: 0.9 },
  "Cultural Competence": { min: 5, max: 10, weight: 0.8 },
  "Adaptability": { min: 6, max: 10, weight: 0.85 }
};

export const SCORING_EXAMPLES = {
  "Compliance": {
    "1": "Shows resistance to following procedures, questions basic documentation requirements",
    "5": "Understands and follows most procedures, may need occasional reminders for documentation",
    "10": "Consistently meets all documentation deadlines, embraces policies and procedures"
  },
  "Stress Tolerance": {
    "1": "Shows significant anxiety about managing caseload, overwhelmed by basic responsibilities",
    "5": "Handles typical intern workload well, may need support during busy periods",
    "10": "Thrives under pressure, effectively manages time and responsibilities"
  },
  "Assertiveness": {
    "1": "Hesitant to ask questions or seek help, avoids speaking up in supervision",
    "5": "Comfortable asking for help when needed, participates in supervision discussions",
    "10": "Proactively seeks guidance, contributes meaningfully to team discussions"
  },
  "Learning Agility": {
    "1": "Struggles to apply feedback, resistant to new approaches or techniques",
    "5": "Open to learning, implements feedback with some guidance",
    "10": "Quickly adapts to new information, actively seeks learning opportunities"
  },
  "Time Management": {
    "1": "Consistently misses deadlines, poor planning for client sessions and documentation",
    "5": "Generally meets deadlines, may need occasional support with scheduling",
    "10": "Excellent time management, consistently meets all deadlines with room to spare"
  },
  "Professional Boundaries": {
    "1": "Unclear understanding of professional boundaries, may overstep with clients or staff",
    "5": "Maintains appropriate boundaries with occasional guidance needed",
    "10": "Exemplary professional boundaries, models best practices for others"
  },
  "Cultural Competence": {
    "1": "Limited awareness of cultural differences, may make assumptions about clients",
    "5": "Shows basic cultural awareness, open to learning about different backgrounds",
    "10": "Demonstrates strong cultural competence, actively seeks to understand diverse perspectives"
  },
  "Adaptability": {
    "1": "Resistant to change, struggles with new systems or procedures",
    "5": "Adapts to changes with some support, shows willingness to learn",
    "10": "Embraces change, quickly adapts to new systems and procedures"
  }
};

export function getRecommendation(scores: Record<string, number>): {
  recommendation: 'recommend' | 'consider' | 'not_recommended';
  confidence: number;
  reasoning: string;
  criticalAreas: string[];
  growthAreas: string[];
} {
  let totalScore = 0;
  let totalWeight = 0;
  let criticalFailures = 0;
  let criticalAreas: string[] = [];
  let growthAreas: string[] = [];
  
  // Critical traits that must meet minimum threshold
  const criticalTraits = ["Compliance", "Professional Boundaries", "Time Management", "Responsibility"];
  
  for (const [trait, score] of Object.entries(scores)) {
    const boundary = TRAIT_BOUNDARIES[trait as keyof typeof TRAIT_BOUNDARIES];
    if (boundary) {
      totalScore += score * boundary.weight;
      totalWeight += boundary.weight;
      
      // Check for critical failures
      if (score < boundary.min) {
        if (criticalTraits.includes(trait)) {
          criticalFailures++;
          criticalAreas.push(trait);
        } else {
          growthAreas.push(trait);
        }
      }
    }
  }
  
  const weightedAverage = totalScore / totalWeight;
  
  // More lenient thresholds for interns
  if (criticalFailures >= 2 || weightedAverage < 5.5) {
    return {
      recommendation: 'not_recommended',
      confidence: 0.8,
      reasoning: `Multiple critical areas below threshold (${criticalFailures} failures). Weighted average: ${weightedAverage.toFixed(1)}`,
      criticalAreas,
      growthAreas
    };
  } else if (criticalFailures === 1 || weightedAverage < 6.5) {
    return {
      recommendation: 'consider',
      confidence: 0.7,
      reasoning: `Some concerns but potential for growth. Weighted average: ${weightedAverage.toFixed(1)}`,
      criticalAreas,
      growthAreas
    };
  } else {
    return {
      recommendation: 'recommend',
      confidence: 0.9,
      reasoning: `Strong fit across all key areas. Weighted average: ${weightedAverage.toFixed(1)}`,
      criticalAreas,
      growthAreas
    };
  }
} 