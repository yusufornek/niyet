import { createContext } from '../context';
import { RulesService, type PaydayBatchResult } from './service';

/// Vercel cron handler tarafından çağrılır.
/// Bugün User.payday günü olan kullanıcıların aktif PAYDAY kurallarını tetikler.
export async function triggerDuePaydayRules(): Promise<PaydayBatchResult> {
  const ctx = await createContext();
  const service = new RulesService({
    prisma: ctx.prisma,
    now: ctx.now,
  });
  return service.triggerDuePaydayRules();
}
