import { GeminiQueryRewriteAdapter } from '@niyet/ai';
import { getPrismaClient, type PrismaClient } from '@niyet/db';
import { RapidApiProductSearchProvider } from './goal-tracking/rapidapi.js';
import type { ProductSearchProvider } from './goal-tracking/product-search.js';
import type { ProductQueryRewriteAdapter } from '@niyet/ai';

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
}

export interface GraphQLContext {
  user: AuthenticatedUser | null;
  prisma: PrismaClient;
  productSearch: ProductSearchProvider;
  queryNormalizer: ProductQueryRewriteAdapter;
  now: () => Date;
}

export interface CreateContextOptions {
  request?: Request;
  user?: AuthenticatedUser | null;
  prismaClient?: PrismaClient;
  productSearch?: ProductSearchProvider;
  queryNormalizer?: ProductQueryRewriteAdapter;
  now?: () => Date;
}

export async function createContext(options: CreateContextOptions = {}): Promise<GraphQLContext> {
  return {
    user: options.user ?? parseUserFromHeaders(options.request) ?? null,
    prisma: options.prismaClient ?? getPrismaClient(),
    productSearch: options.productSearch ?? new RapidApiProductSearchProvider(),
    queryNormalizer: options.queryNormalizer ?? new GeminiQueryRewriteAdapter(),
    now: options.now ?? (() => new Date())
  };
}

function parseUserFromHeaders(request?: Request): AuthenticatedUser | null {
  const userId = request?.headers.get('x-niyet-user-id');

  if (!userId) {
    return null;
  }

  return {
    id: userId,
    email: request?.headers.get('x-niyet-user-email')
  };
}
