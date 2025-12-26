import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
}

// Only create client if DATABASE_URL is set (build-safe)
export const prisma = process.env.DATABASE_URL
  ? (global.prisma || createPrismaClient())
  : (null as unknown as PrismaClient);

if (process.env.NODE_ENV !== 'production' && process.env.DATABASE_URL) {
  global.prisma = prisma;
}

export * from '@prisma/client';
