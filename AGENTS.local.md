# Repository Guidelines

## Project Structure & Module Organization

This is a Bun workspace for Niyet, an AI-assisted micro-retirement platform.

- `apps/web/`: Next.js 15 App Router app, GraphQL endpoint, UI components, Supabase clients, and Playwright tests in `apps/web/e2e/`.
- `packages/core/`: shared domain types, Zod schemas, formatters, scoring, and savings logic; tests live in `src/__tests__/`.
- `packages/db/`: Prisma schema, migrations, seed scripts, and database client exports.
- `packages/graphql/`: Pothos code-first schema and resolvers, organized by domain in `src/schema/`.
- `packages/ai/`: Gemini client, prompts, tool definitions, and pipelines.
- `packages/config/`: shared ESLint, TypeScript, and Tailwind presets.
- `apps/web-legacy/`: legacy Vite mockup for reference only; do not add new product code there.

## Build, Test, and Development Commands

- `bun dev`: run all workspace development tasks through Turborepo.
- `bun --filter @niyet/web dev`: run only the web app on port `3030`.
- `bun build`: build all workspaces.
- `bun lint`: run workspace lint checks.
- `bun type-check`: run TypeScript checks.
- `bun test`: run unit tests.
- `bun test:e2e`: run Playwright end-to-end tests.
- `bun db:generate`, `bun db:migrate`, `bun db:seed`, `bun db:reset`, `bun db:studio`: Prisma workflows.

Use `bun lint && bun type-check && bun test` before pushing.

## Coding Style & Naming Conventions

Use strict TypeScript. Avoid `any`; prefer `unknown` plus narrowing. Runtime boundaries should use Zod where practical. Keep identifiers in English.

Naming patterns:

- Components: `PascalCase`
- Hooks: `useFooBar`
- Files for components: `kebab-case.tsx`
- Utility files: `camelCase.ts`
- Constants: `SCREAMING_SNAKE_CASE`

React defaults to Server Components; add `'use client'` only for browser interactivity. Do not manually edit generated shadcn primitives in `apps/web/components/ui/*`.

## Testing Guidelines

Vitest covers unit tests, especially business logic in `packages/core`. Name tests by behavior, for example `future-score.test.ts`. Playwright covers critical flows in `apps/web/e2e/`. Add focused tests when changing scoring, category mapping, savings logic, GraphQL contracts, or user-facing flows.

## Commit & Pull Request Guidelines

History follows scoped Conventional Commits: `feat(seed): ...`, `fix(mobile): ...`, `fix(vercel): ...`. Use concise Turkish commit subjects where appropriate.

Pull requests should include a summary, test evidence, linked context, and screenshots for UI changes. Keep PRs scoped to one feature or fix. Do not edit existing Prisma migrations; create a new migration when the schema changes.

## Security & Configuration Tips

Keep secrets server-only and out of Git. Validate external input at boundaries. Banking data is mocked, but Gemini API calls are real, so handle API keys, retries, caching, and output validation carefully.
