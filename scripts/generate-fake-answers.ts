import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

const FAKE_ANSWERS = {
  q1: {
    followup0: "I chose to apply to Momentum because I'm passionate about helping others and making a real difference in people's lives. I've always been drawn to counseling as a way to support people through their challenges and help them grow.",
    followup1: "What specifically drew me to Momentum was your focus on evidence-based practices and your commitment to continuous learning. I believe in staying current with the latest research and techniques.",
    followup2: "I'm particularly motivated by the opportunity to work with diverse populations and help create positive change in people's lives. This aligns perfectly with my personal values and professional goals."
  },
  q2: {
    followup0: "I've developed a structured approach to managing multiple client sessions. I maintain a detailed calendar, set aside specific time for documentation, and use productivity tools to stay organized. I also prioritize self-care to maintain my energy levels.",
  },
  q3: {
    followup0: "I plan to manage the initial overwhelm by breaking down the learning process into manageable steps. I'll create a structured schedule for learning new tools and policies, and I'm comfortable asking for help when needed. I've successfully adapted to new systems before and I'm confident in my ability to do so again.",
  },
  q4: {
    followup0: "I'm particularly interested in working with adolescents and young adults, as I have experience in this area. I'm also comfortable working with diverse populations and believe in creating an inclusive environment for all clients.",
  },
  q5: {
    followup0: "I understand the importance of timely documentation and accurate diagnosis for insurance purposes. I'm committed to following all policies and procedures to ensure proper client care and compliance.",
    followup1: "I've worked with similar documentation requirements before and understand the importance of accuracy and timeliness. I'm comfortable with the structured approach required for insurance documentation.",
  },
  q6: {
    followup0: "I fully understand and respect these expectations. I believe in following organizational policies and procedures, and I'm comfortable with leadership making final decisions.",
    followup1: "I've worked in similar environments where certain decisions were reserved for leadership, and I understand the importance of maintaining professional boundaries.",
    followup2: "I'm committed to following these guidelines while still providing the best possible care to my clients within the established framework."
  },
  q7: {
    followup0: "I had a challenging case where I needed to consult with a supervisor. I recognized my limitations, reached out proactively, and learned valuable insights that helped me better serve the client.",
    followup1: "This experience taught me the importance of knowing when to ask for help and how to use supervision effectively. It's a sign of professional maturity to recognize when you need support.",
    followup2: "I've since developed a better understanding of when to seek guidance and how to make the most of supervision opportunities."
  },
  q8: {
    followup0: "I'm very flexible and willing to work evenings and weekends to accommodate client needs. I understand the importance of being available when clients need support.",
    followup1: "I'm comfortable with documentation deadlines and following evolving systems. I see these as opportunities to improve my practice and better serve clients.",
    followup2: "While I'm generally very flexible, I believe in maintaining healthy boundaries and would need to ensure I have adequate time for self-care and professional development."
  }
};

async function generateFakeAnswers() {
  const tmpDir = path.join(process.cwd(), 'tmp');
  await mkdir(tmpDir, { recursive: true });

  const interviewId = 'interview_1749788545200_2s9qhydcn';

  for (const [questionId, followups] of Object.entries(FAKE_ANSWERS)) {
    for (const [followupId, answer] of Object.entries(followups)) {
      const filename = `${interviewId}_${questionId}_${followupId}.json`;
      const filePath = path.join(tmpDir, filename);

      const transcriptData = {
        interviewId,
        questionId,
        followUpIndex: parseInt(followupId.replace('followup', '')),
        videoFile: `${interviewId}_${questionId}_${followupId}.webm`,
        transcriptFile: filename,
        timestamp: new Date().toISOString(),
        segments: [{
          text: answer,
          start: 0,
          end: 30,
          words: answer.split(' ').map((word, i) => ({
            word,
            start: i * 2,
            end: (i + 1) * 2
          }))
        }]
      };

      await writeFile(filePath, JSON.stringify(transcriptData, null, 2));
      console.log(`Generated ${filename}`);
    }
  }
}

generateFakeAnswers().catch(console.error); 