/**
 * GraphQL context — her request başına oluşturulur.
 *
 * Şu an basit: prisma client + user id (auth eklenince Supabase Auth'tan gelir).
 * Demo aşamasında auth bypass: Ayşe demo user'ı default kullanılır.
 */
import { prisma } from '@niyet/db';

export interface GraphQLContext {
  prisma: typeof prisma;
  /** Authenticated user id (Supabase Auth subject veya demo user) */
  userId: string | null;
}

/** Demo amaçlı: Ayşe'nin ID'sini çek. Auth eklenene kadar burası bypass. */
export async function createContext(): Promise<GraphQLContext> {
  // Demo: ayse@niyet.app'i otomatik authenticate et
  const ayse = await prisma.user.findUnique({
    where: { email: 'ayse@niyet.app' },
    select: { id: true },
  });
  return {
    prisma,
    userId: ayse?.id ?? null,
  };
}
