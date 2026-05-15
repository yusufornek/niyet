import { refreshDueGoalPrices } from '@niyet/graphql';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await refreshDueGoalPrices({
    limit: numberFromEnv('PRICE_REFRESH_BATCH_LIMIT', 20),
    concurrency: numberFromEnv('PRICE_REFRESH_CONCURRENCY', 2),
  });

  return Response.json({
    ok: true,
    ...result,
  });
}

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
