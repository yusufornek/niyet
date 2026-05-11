# Architecture

Niyet is organized as a Bun/npm workspace monorepo. Backend code is split by boundary so domain rules stay pure and external services remain replaceable.

## Packages

- `packages/core`: framework-free goal tracking domain logic. It normalizes product queries, parses prices, and calculates goal progress, remaining amount, monthly saving need, and significant price changes.
- `packages/ai`: Gemini/Gemma query rewrite adapter. It only rewrites product search text and returns `null` on missing keys, API errors, invalid JSON, or schema mismatch.
- `packages/db`: Prisma client and schema. Goal tracking tables are scoped by `userId` and designed for Supabase PostgreSQL.
- `packages/graphql`: Pothos/Yoga GraphQL API, Zod boundary validation, RapidAPI product search adapter, and application service orchestration.

## Goal Tracking Flow

1. Client calls `normalizeGoalProductQuery(rawQuery)`.
2. Backend asks Gemini/Gemma to rewrite the query; invalid or unavailable LLM responses fall back to deterministic cleanup in `@niyet/core`.
3. Client calls `searchGoalProducts(query)`; backend calls RapidAPI and returns normalized product results.
4. Client creates a goal with the selected product using `createGoalTrackingGoal(input)`.
5. Backend writes `GoalTrackingGoal` and the initial `GoalPriceHistory`.
6. `refreshGoalTrackedPrice(goalId)` searches RapidAPI again, matches by URL, title similarity, then source, updates current price/history, and creates a `GoalPriceAlert` when the price moved by at least 5%.

All GraphQL goal tracking operations require an authenticated context user. The local standalone Yoga server accepts `x-niyet-user-id` for development; the Next.js/Supabase integration should populate the same context from the verified session.
