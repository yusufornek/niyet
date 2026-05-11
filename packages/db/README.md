# @niyet/db

> Niyet'in tek **postgres schema'sının** ve **migration'ların** sahibi. Prisma ile yönetilir.

**Faz 1'de doldurulacak**:
- `prisma/schema.prisma` — Niyet tüm entity'leri (User, Account, Transaction, Goal, ...)
- `prisma/migrations/` — Otomatik üretilen migration'lar
- `prisma/seed.ts` — Ayşe persona + 90 gün mock transaction
- `prisma/rls.sql` — Supabase RLS policy'leri (auth.uid filter)
- `src/index.ts` — PrismaClient instance + tip re-export'ları

## Komutlar

```bash
bun --filter @niyet/db generate     # Prisma client üret
bun --filter @niyet/db migrate      # Dev migration oluştur ve uygula
bun --filter @niyet/db migrate:prod # Production migration deploy
bun --filter @niyet/db seed         # Ayşe persona seed
bun --filter @niyet/db reset        # DB sıfırla + yeniden seed
bun --filter @niyet/db studio       # Prisma Studio (DB browser)
```

## Supabase + Prisma Notları

- `DATABASE_URL` (pooled, 6543) — runtime queries için
- `DIRECT_URL` (direct, 5432) — migration için
- `?pgbouncer=true&connection_limit=1` parametre zorunlu

Detay: `ARCHITECTURE.md` §4 ve `HANDOFF.md` "Sık Karşılaşılan Sorunlar".
