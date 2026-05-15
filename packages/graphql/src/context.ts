/**
 * GraphQL context — her request başına oluşturulur.
 *
 * Real Supabase Auth:
 *  - Yoga handler request cookie'sinden Supabase user'ı çekip authUserId geçer
 *  - Auth user → DB User kaydı (authId field'ı ile eşleşir)
 *  - Eşleşme yoksa Ayşe demo persona'sına düşer
 *
 * Demo aşamasında jüri "Demo modunda dene" tıklarsa anonymous Supabase session
 * açılır; DB'de matching User olmadığı için Ayşe persona'sı görünür.
 */
import { prisma } from '@niyet/db';
import {
  GeminiGoalPlanNarrator,
  GeminiQueryRewriteAdapter,
  type GoalPlanNarrator,
  type ProductQueryRewriteAdapter,
} from '@niyet/ai';
import { RapidApiProductSearchProvider } from './goal-tracking/rapidapi';
import type { ProductSearchProvider } from './goal-tracking/product-search';

export interface GraphQLContext {
  prisma: typeof prisma;
  /** DB'deki User.id (real authed veya Ayşe demo fallback) */
  userId: string | null;
  /** Supabase Auth subject (auth.uid). Anonymous session'larda da var. */
  authId: string | null;
  productSearch: ProductSearchProvider;
  queryNormalizer: ProductQueryRewriteAdapter;
  goalPlanNarrator: GoalPlanNarrator;
  now: () => Date;
}

export interface CreateContextOptions {
  /** Supabase JWT'den extract edilmiş user id */
  authUserId?: string | null;
  productSearch?: ProductSearchProvider;
  queryNormalizer?: ProductQueryRewriteAdapter;
  goalPlanNarrator?: GoalPlanNarrator;
  now?: () => Date;
}

export async function createContext(opts: CreateContextOptions = {}): Promise<GraphQLContext> {
  const authId = opts.authUserId ?? null;
  const productSearch = opts.productSearch ?? new RapidApiProductSearchProvider();
  const queryNormalizer = opts.queryNormalizer ?? new GeminiQueryRewriteAdapter();
  const goalPlanNarrator = opts.goalPlanNarrator ?? new GeminiGoalPlanNarrator();
  const now = opts.now ?? (() => new Date());

  if (authId) {
    const user = await prisma.user.findUnique({
      where: { authId },
      select: { id: true },
    });
    if (user)
      return {
        prisma,
        userId: user.id,
        authId,
        productSearch,
        queryNormalizer,
        goalPlanNarrator,
        now,
      };
  }

  // Ayşe fallback — demo aşamasında shared persona
  const ayse = await prisma.user.findUnique({
    where: { email: 'ayse@niyet.app' },
    select: { id: true },
  });
  return {
    prisma,
    userId: ayse?.id ?? null,
    authId,
    productSearch,
    queryNormalizer,
    goalPlanNarrator,
    now,
  };
}
