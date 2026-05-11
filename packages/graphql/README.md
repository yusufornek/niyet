# @niyet/graphql

> Niyet'in **GraphQL schema'sı + resolver'ları**. Pothos (code-first, type-safe) ile yazılır.

**Faz 4'te doldurulacak**:
- `src/builder.ts` — Pothos builder + Prisma plugin + auth-scopes plugin setup
- `src/schema/transaction.ts` — Transaction tipleri ve Query/Mutation
- `src/schema/goal.ts` — Goal tipleri
- `src/schema/analysis.ts` — AnalysisRun, runAnalysis mutation
- `src/schema/index.ts` — Tüm schema'ları birleştir
- `src/index.ts` — Yoga handler factory

## API Surface

**Query'ler** (tahminî):
- `me`, `dashboard`, `transactions`, `categoryBreakdown`, `subscriptions`,
  `analysisHistory`, `goals`, `goal`, `circles`, `futureScore`, `notifications`

**Mutation'lar** (tahminî):
- `runAnalysis`, `editTransactionCategory`, `createRule`, `pauseRule`,
  `acceptSavingOpportunity`, `createGoal`, `updateGoal`, `joinCircle`,
  `simulateBankConnection`, `disconnectBank`, `markNotificationRead`

Detay: `ARCHITECTURE.md` §7.

## Realtime Notu

GraphQL Subscription **kullanılmaz**. Realtime için doğrudan Supabase Realtime client'ı kullanılır. Bu paket sadece query/mutation handler'ı.
