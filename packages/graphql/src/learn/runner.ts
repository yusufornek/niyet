import { prisma } from '@niyet/db';

import { LearnService } from './service';

export async function refreshLearnContentDaily(options?: { now?: () => Date }) {
  const service = new LearnService(prisma, options?.now ?? (() => new Date()));
  return service.refreshDailyPack();
}
