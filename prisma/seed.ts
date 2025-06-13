import { PrismaClient } from '@prisma/client';
import { INTERVIEW_QUESTIONS } from '../utils/questions';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clear existing questions
  await prisma.question.deleteMany();

  // Seed interview questions
  for (const question of INTERVIEW_QUESTIONS) {
    await prisma.question.create({
      data: {
        id: question.id,
        order: question.order,
        category: question.category,
        question: question.question,
        traits: JSON.stringify(question.traits),
        isActive: true
      }
    });
    console.log(`✓ Added question: ${question.id}`);
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 