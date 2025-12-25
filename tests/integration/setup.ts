import { beforeAll, afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/db';

beforeAll(async () => {
  // Verify database connection
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up test data before each test if needed
  // This runs before each test to ensure isolation
});
