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
    question: "What inspired you to pursue a career in counseling, and what specifically attracted you to Momentum?",
    traits: ["Achievement", "Passion/Motivation", "Cultural Competence"],
    momentumMetrics: ["Alignment with organization", "intention"]
  },
  {
    id: "q2", 
    order: 2,
    category: "logistics",
    question: "As a counselor at Momentum, you'll have 6-12 client sessions per week. How do you plan to balance this workload with your other commitments?",
    traits: ["Achievement", "Responsibility", "Time Management", "Adaptability"],
    momentumMetrics: ["Has realistic plan", "time commitment"]
  },
  {
    id: "q3",
    order: 3,
    category: "stress_management",
    question: "Starting a new role can be challenging with new systems and procedures to learn. How do you typically handle new learning curves, and what strategies would you use to manage the initial transition period?",
    traits: ["Stress Tolerance", "Planning", "Adaptability", "Learning Agility"],
    momentumMetrics: ["Managing busy start"]
  },
  {
    id: "q4",
    order: 4,
    category: "diversity",
    question: "Our clients come from various backgrounds and age groups. Could you share which client populations you're most interested in working with, and are there any groups you might need additional support or training to work with effectively?",
    traits: ["Extroversion", "Cooperativeness", "Cultural Competence", "Professional Boundaries"],
    momentumMetrics: ["Open to diversity", "population fit"]
  },
  {
    id: "q5",
    order: 5,
    category: "compliance",
    question: "Documentation and insurance-related diagnoses are important parts of our work. How do you feel about meeting documentation deadlines and providing diagnoses for insurance purposes?",
    traits: ["Competitiveness", "Compliance", "Conscientiousness", "Time Management"],
    momentumMetrics: ["Comfort with policy", "structure", "diagnosing"]
  },
  {
    id: "q6",
    order: 6,
    category: "boundaries",
    question: "At Momentum, we have specific policies about opinion letters and decision-making authority. How do you feel about following these guidelines where leadership makes final decisions and clinicians don't provide opinion letters?",
    traits: ["Assertiveness", "Compliance", "Judgment", "Professional Boundaries"],
    momentumMetrics: ["Accepting of policy decisions", "professional boundaries"]
  },
  {
    id: "q7",
    order: 7,
    category: "growth",
    question: "Could you share a specific example of when you needed to ask for help or support in a professional setting? What was the situation, and how did you handle it?",
    traits: ["Assertiveness", "Learning Agility", "Judgment", "Adaptability"],
    momentumMetrics: ["Knowing when to escalate", "growth mindset"]
  },
  {
    id: "q8",
    order: 8,
    category: "flexibility",
    question: "Our role requires flexibility in several areas: working evenings/weekends, meeting documentation deadlines, adapting to new systems, and sometimes stepping outside your comfort zone. Could you share your thoughts on these requirements and any limitations you might have?",
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