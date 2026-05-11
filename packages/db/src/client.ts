import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prismaClient?: PrismaClient;
};

export function getPrismaClient(): PrismaClient {
  const prismaClient = globalForPrisma.prismaClient ?? new PrismaClient();

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prismaClient = prismaClient;
  }

  return prismaClient;
}

export type { PrismaClient };
