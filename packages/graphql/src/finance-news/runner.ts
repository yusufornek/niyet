import { prisma } from '@niyet/db';

import { FinanceNewsService } from './service';

export async function refreshFinanceNews(options?: { now?: () => Date }) {
  const service = new FinanceNewsService(prisma, options?.now ?? (() => new Date()));
  return service.refreshFeed();
}
