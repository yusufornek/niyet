import { createContext } from '../context';
import { GoalTrackingService, type PriceRefreshBatchResult } from './service';

export async function refreshDueGoalPrices(
  options: {
    limit?: number;
    concurrency?: number;
  } = {},
): Promise<PriceRefreshBatchResult> {
  const ctx = await createContext();
  return new GoalTrackingService({
    prisma: ctx.prisma,
    productSearch: ctx.productSearch,
    queryNormalizer: ctx.queryNormalizer,
    now: ctx.now,
  }).refreshDuePrices(options.limit, options.concurrency);
}
