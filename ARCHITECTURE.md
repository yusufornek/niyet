# ARCHITECTURE.md — Niyet Sistem Mimarisi

> Yüksek seviye system design + her component'in sorumluluğu + tipik request akışları.

---

## 1. Sistem Diyagramı

```
┌─────────────────────────────────────────────────────────────────┐
│                       Jüri / Kullanıcı                          │
│                  (Vercel deployed Next.js app)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│            Next.js 15 (App Router) — apps/web                   │
│                                                                 │
│  ┌─────────────────────────┐    ┌─────────────────────────┐     │
│  │  Server Components      │    │  Client Components      │     │
│  │  (default)              │    │  ('use client')         │     │
│  │  • SEO, initial load    │    │  • Interactivity        │     │
│  │  • Direct DB access     │    │  • Zustand store        │     │
│  └─────────┬───────────────┘    │  • TanStack Query       │     │
│            │                    │  • Supabase Realtime    │     │
│            │                    └─────────┬───────────────┘     │
│            │                              │                     │
│  ┌─────────┴──────────────────────────────┴──────────────┐      │
│  │           Mockup'tan migrate edilmiş 20 ekran         │      │
│  │   (PhoneShell, Dashboard, Radar, Goals, Score, ...)   │      │
│  └───────────────────────────────────────────────────────┘      │
└──────┬──────────────────────────────┬───────────────────────────┘
       │                              │
       │ POST /api/graphql            │ Supabase JS SDK
       │ (Yoga handler)               │ (auth + realtime subscribe)
       ▼                              ▼
┌──────────────────────┐    ┌──────────────────────────────────────┐
│ GraphQL Yoga         │    │            Supabase                  │
│ + Pothos resolvers   │    │  ┌──────────┐ ┌──────────┐ ┌──────┐ │
│ packages/graphql     │◄──►│  │PostgreSQL│ │  Auth    │ │Storage││
│                      │    │  │  (RLS)   │ │ (JWT)    │ │      ││
│ • Query: dashboard,  │    │  └──────────┘ └──────────┘ └──────┘ │
│   transactions, ...  │    │  ┌─────────────────────────────────┐│
│ • Mutation: runAna-  │    │  │     Realtime (DB events)        ││
│   lysis, editTx, ... │    │  │  (postgres_changes, broadcast)  ││
└─────────┬────────────┘    │  └─────────────────────────────────┘│
          │                 └──────────────────────────────────────┘
          │ Prisma Client
          ▼
┌──────────────────────────────────────────────────────────────────┐
│              packages/db (Prisma schema + migrations)            │
│  Tables: User, Account, BankConnection, Transaction, Category,   │
│  Subscription, AnalysisRun, TransactionAnalysis, Goal,           │
│  GoalCheckpoint, Rule, Circle, CircleMembership,                 │
│  FutureScoreSnapshot, Notification                               │
└──────────────────────────────────────────────────────────────────┘

         ┌────────────────────────────────────┐
         │   packages/ai — Gemini integration │
         │   ─────────────────────────────────│
         │   • Client (Google Gen AI SDK)     │
         │   • Function definitions:          │
         │     - set_transaction_category()   │
         │     - mark_as_subscription()       │
         │     - flag_reducible()             │
         │     - recommend_micro_saving()     │
         │   • System prompts (TR)            │
         │   • Pipeline: batch → analyze →    │
         │     cache → broadcast              │
         └────────────────────────────────────┘
                    ▲
                    │ Triggered by runAnalysis mutation
                    │
            ┌───────┴────────┐
            │  GraphQL layer │
            └────────────────┘
```

---

## 2. Paketler ve Sorumluluklar

### `apps/web`
**Sorumluluk**: Tüm kullanıcı arayüzü + GraphQL endpoint hosting.
- App Router file-based routing
- Server Components (default) + Client Components (interactivity gerekirse)
- shadcn/ui primitives + custom design system (PhoneShell, ScoreCard, vs.)
- Supabase JS client (auth + realtime)
- TanStack Query + graphql-request

### `apps/web-legacy` _(referans)_
**Sorumluluk**: Eski Vite + React mockup, sadece **design referansı**. Yeni kod yazılmaz.

### `apps/mobile` _(future, placeholder)_
**Sorumluluk**: React Native Expo mobile app. Yarışma sonrası fazda doldurulacak. `packages/core` business logic'ini paylaşacak.

### `packages/db`
**Sorumluluk**: Postgres schema'nın tek kaynağı.
- `prisma/schema.prisma` — entity tanımları, enum'lar, ilişkiler
- `prisma/migrations/` — auto-generated migration'lar
- `prisma/seed.ts` — Ayşe persona + 90 gün mock transaction
- `prisma/rls.sql` — Supabase RLS policy'leri (auth.uid() filters)
- Export: PrismaClient instance, generated types

### `packages/graphql`
**Sorumluluk**: GraphQL schema ve resolver'lar.
- Pothos builder (code-first, Prisma plugin)
- `src/schema/*.ts` — domain başına tip + query + mutation
- Authorization (Pothos auth-scopes plugin)
- Yoga endpoint factory → `apps/web/app/api/graphql/route.ts` import eder

### `packages/ai`
**Sorumluluk**: Gemini entegrasyonu, AI pipeline.
- Google Gen AI SDK client
- Function definitions (Gemini'nin çağırabileceği)
- System prompts (Türkçe, few-shot)
- Pipeline: batch transaction → Gemini → function call'ları handle et → DB cache → broadcast

### `packages/core`
**Sorumluluk**: Cross-cutting shared logic (web + future mobile).
- Zod schemas (paylaşımlı domain types)
- Constants (15 kategori enum, ikonlar, renkler)
- Future Score hesap fonksiyonu
- Savings opportunity hesap fonksiyonu
- Formatter'lar (TL, tarih, vs.)

### `packages/config`
**Sorumluluk**: Shared dev tooling preset'leri.
- `eslint-config/` — base ESLint config + Next.js variant
- `tsconfig/` — base.json, nextjs.json, library.json
- `tailwind-config/` — base preset (HSL token'lar)

---

## 3. Tipik Request Akışları

### Akış A: Kullanıcı Dashboard'u açıyor
1. Browser → `https://niyet.vercel.app/dashboard`
2. Next.js Server Component `app/(app)/dashboard/page.tsx`:
   - `createSupabaseServerClient()` ile auth check
   - Auth'lu user yoksa `redirect('/login')`
3. Server Component'ta GraphQL `dashboard` query'si execute edilir (server-side fetch)
4. Initial HTML ile birlikte data hydrate edilir
5. Client'ta interactivity (chart hover, kategori tıklama) için Client Component'ler

### Akış B: "Analiz Et" butonuna basılınca
1. Client Component → `useMutation` ile `runAnalysis` GraphQL mutation
2. `/api/graphql` Yoga handler → Pothos resolver → `packages/ai/pipeline.ts`
3. `pipeline.ts`:
   - User'ın son 90 gün transaction'larını çek (Prisma)
   - Gemini'ye batch gönder: system prompt + 15 kategori enum + transaction listesi + function definitions
   - Gemini response → her function call için handler çağır
   - `AnalysisRun` ve `TransactionAnalysis` kayıtları oluştur
   - İlgili `Transaction` field'larını update et
4. Mutation cevabı dön: `AnalysisRun` ID
5. Supabase Realtime'a "analiz tamamlandı" broadcast at
6. Frontend Realtime listener → toast + TanStack Query invalidate
7. Dashboard otomatik yenilenir

### Akış C: Kullanıcı kategori düzeltiyor
1. Transaction'a sağ tıkla → "Kategoriyi düzelt" sheet açılır
2. shadcn/ui Select'ten yeni kategori seç
3. `editTransactionCategory` mutation çağrılır (Optimistic update — UI hemen güncellenir)
4. Backend resolver → Prisma update → `categoryEdited: true` işaretlenir
5. Geçmiş `TransactionAnalysis` invalidate edilmez (history için saklanır)
6. UI'da Sonner toast: "Kategori güncellendi"

### Akış D: Bildirim akışı
1. Backend bir notification yaratır (örn: hedef milestone, AI insight)
2. `Notification` tablosuna insert → Supabase Realtime `postgres_changes` event tetikler
3. Frontend Supabase JS client `channel.on('postgres_changes', ...)` ile dinler
4. Yeni notification → Sonner toast + notification panel'da listeye eklenir

---

## 4. Auth Akışı (Supabase Auth)

```
[Browser]──login(email,password)──►[Supabase Auth]
                                          │
                                          ▼
                                     JWT cookie set
                                          │
[Next.js middleware]◄────────────────────┘
   │ (her request'te)
   │ • supabase.auth.getUser()
   │ • Protected route ise redirect /login
   │ • Authed user'ı request context'e koy
   ▼
[Server Component / Route Handler]
   │
   ▼
[Prisma query] — RLS policy'leri auth.uid() = userId koşulu uygular
```

**Anahtar nokta**: Prisma Supabase'in service role key ile bağlanır (RLS bypass), authorization GraphQL resolver seviyesinde Pothos auth-scopes ile yapılır. Doğrudan client-from-DB pattern'ı (RLS'in tek başına yeterli olduğu) kullanmıyoruz çünkü Gemini analizleri gibi kompleks operasyonlar resolver'larda.

---

## 5. Realtime Stratejisi

**Kanal isimlendirme**:
- `notifications:user-{userId}` — yeni notification insert
- `transactions:user-{userId}` — yeni transaction batch insert (seed sırasında)
- `analysis:user-{userId}` — analiz run başladı/tamamlandı

**Frontend subscribe örneği**:
```ts
const channel = supabase
  .channel(`notifications:user-${userId}`)
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'Notification', filter: `userId=eq.${userId}` },
    (payload) => {
      toast(payload.new.title);
      queryClient.invalidateQueries(['notifications']);
    }
  )
  .subscribe();
```

**Backend broadcast**: Prisma `notification.create()` Realtime'ı otomatik tetikler. Custom broadcast için Supabase JS client (service role).

---

## 6. AI Pipeline Detayı (Agentic Yaklaşım)

> Niyet'in AI tarafı sadece "prompt → text" değil; **agentic** mimari. Planner + Tool Selection + Executor loop pattern'ı uygulanır. Detay ve tüm pattern'lar: [`ENGINEERING.md` §12-13](./ENGINEERING.md#12-agentic-ai-mimarisi).

Niyet'te dört agent pattern'ı:
- **Pattern A** — Spending Analyzer Agent (single-shot batch + function calling)
- **Pattern B** — AI Saving Coach (multi-turn conversational agent loop)
- **Pattern C** — Goal Forecasting Agent (tool-use ile enflasyon + fiyat verisini birleştirir)
- **Pattern D** — Future Score Updater (pure logic, agent organizasyonu pattern'ı)

Tüm agent'larda **bounded autonomy** (kullanıcı onayı olmadan para hareketi yok), **transparency** (her call log'lanır), **fallback** (max iteration limit), **cost cap** (token bütçesi) prensipleri uygulanır.

### Gemini Function Calling Setup
```ts
// packages/ai/src/functions/index.ts
export const functions = [
  {
    name: "set_transaction_category",
    description: "Bir transaction'ı 15 kategoriden birine ata",
    parameters: { /* Zod-derived JSON schema */ },
  },
  {
    name: "mark_as_subscription",
    description: "Düzenli abonelik tespit edildiğinde işaretle",
    parameters: { /* ... */ },
  },
  // ...
];
```

### Pipeline Adımları
```
runAnalysis(userId) →
  fetch last 90d transactions (Prisma) →
  build prompt (system + categories enum + transactions JSON) →
  Gemini call (model: gemini-2.5-flash, tools: functions) →
  for each functionCall in response:
    handler[name](args) → write to DB
  create AnalysisRun (request, response, duration) →
  Supabase broadcast "analysis:done" →
  return AnalysisRun ID
```

### Hata Yönetimi
- Timeout (>30s): retry 1 kez
- Function call schema mismatch: Zod parse error → log + skip
- Tüm batch fail: kullanıcıya "AI şu an çalışmıyor" toast

### Maliyet/Performans
- 300 transaction tek call ile gönderilir (~10K token input + 5K token output ≈ <$0.01)
- Cache: aynı user için son `AnalysisRun` 1 saat valid (jüri tekrar tetiklerse cache)

---

## 7. Deployment

```
Developer push to main
      │
      ▼
┌─────────────────┐
│ GitHub Actions  │
│ • lint          │
│ • type-check    │
│ • vitest        │
└────────┬────────┘
         │ green
         ▼
┌─────────────────┐
│ Vercel CD       │
│ • build (turbo) │
│ • deploy        │
└────────┬────────┘
         │
         ├─► Preview URL (her push)
         └─► Production URL (main)
```

**Env yönetimi**: Vercel dashboard'tan `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` set edilir. Hem production hem preview environment'larına.

**DB migration**: Local'de `bun db:migrate` ile schema değişikliği. Production'a manuel `bun --filter @niyet/db migrate:prod` (CI'da değil, kasıtlı olarak — yanlışlık önleme).

---

## 8. Performans Hedefleri (Demo)

| Metric | Hedef | Neden |
|---|---|---|
| **First Contentful Paint** | < 1.5s | Jüri'nin sabırsız olabileceği ilk izlenim |
| **GraphQL `dashboard` query** | < 200ms | Direk Prisma, indexed columns |
| **`runAnalysis` mutation** | < 5s | Gemini call dahil |
| **Realtime event latency** | < 1s | Supabase typical |
| **Bundle size (web, main)** | < 250KB gzipped | shadcn'in seçici import'u, dynamic import |

---

## 9. Güvenlik (Detay: SECURITY.md)

- Tüm DB tabloları RLS aktif, `auth.uid() = userId` policy'leri
- Service role key sadece server-side (Prisma)
- GraphQL resolver'larda authorization Pothos auth-scopes ile zorlanır
- `NEXT_PUBLIC_*` env vars dışındaki secret'lar asla client'a sızmaz
- KVKK: kullanıcı verisi yalnızca açık rıza ile işlenir; "bağlantıyı kes" butonu tek tıkla veriyi siler
