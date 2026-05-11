# ENGINEERING.md — Niyet Mühendislik Manifestosu

> Bu doküman Niyet'in **mühendislik kalitesini** taşıyan prensipleri, pattern'ları ve disiplinleri tanımlar. PR review'larında ve kod tasarımında **karar referansıdır**. Her yeni ekip üyesi okumalı, her PR bu prensiplere uyup uymadığı açısından gözden geçirilmelidir.

> **Felsefe**: "Çalışan kod" yeterli değil. "Doğru çalışan, anlaşılabilir, değiştirilebilir, ölçülebilir kod" hedefimiz. Demo süresi kısıtlı ama temel ne kadar sağlamsa o kadar hızlı genişler.

---

## İçindekiler
1. [Temel Prensipler](#1-temel-prensipler)
2. [Clean Architecture & Katman Disiplini](#2-clean-architecture--katman-disiplini)
3. [SOLID Prensipleri (Pratik Uygulama)](#3-solid-prensipleri-pratik-uygulama)
4. [Type-Driven Design](#4-type-driven-design)
5. [Domain-Driven Design (Light)](#5-domain-driven-design-light)
6. [Hata Yönetimi & Defensive Programming](#6-hata-yönetimi--defensive-programming)
7. [Test Disiplini](#7-test-disiplini)
8. [Observability (Logging, Metrics, Tracing)](#8-observability-logging-metrics-tracing)
9. [Performance Budget](#9-performance-budget)
10. [Güvenlik by Design](#10-güvenlik-by-design)
11. [12-Factor App Uyumu](#11-12-factor-app-uyumu)
12. [Agentic AI Mimarisi](#12-agentic-ai-mimarisi)
13. [AI Doğruluk ve Performans Güvenceleri](#13-ai-doğruluk-ve-performans-güvenceleri)
14. [Code Review Disiplini](#14-code-review-disiplini)
15. [Documentation as Code](#15-documentation-as-code)
16. [Anti-Pattern'lar (Kaçınılacaklar)](#16-anti-patternlar-kaçınılacaklar)

---

## 1. Temel Prensipler

### 1.1. **Readability > Cleverness**
Kod **bir kez yazılır, on kez okunur**. Akıllı tek-satır çözümler yerine **niyetini açıkça gösteren** kod yaz. İyi adlandırma > yorum.

```ts
// Kötü: Clever ama opak
const r = txs.filter(t => t.a > avg && t.c === 'COFFEE').reduce((s,t) => s+t.a, 0);

// İyi: Niyet açık
const reducibleCoffeeOpportunity = transactions
  .filter(tx => tx.amount > averageCoffeeAmount && tx.category === 'COFFEE')
  .reduce((sum, tx) => sum + tx.amount, 0);
```

### 1.2. **YAGNI — You Aren't Gonna Need It**
Hipotetik gelecek senaryolar için soyutlama üretme. **Üç benzer kullanım** olunca refactor et. İlk seferde generic factory pattern kurma.

### 1.3. **DRY — Don't Repeat Yourself (ama Rule of Three)**
İki yerde tekrar varsa **inline tut**. Üç yere ulaşınca soyutla. Erken DRY = yanlış DRY.

### 1.4. **KISS — Keep It Simple, Stupid**
Basit çözüm her zaman daha az hata, daha kolay test, daha kolay onboarding demektir. "Bu pattern'ı uygulamak için bir sebep var mı?" sor.

### 1.5. **Fail Fast**
Geçersiz state'i mümkün olduğunca erken yakala — input boundary'sinde (Zod validation), function entry'sinde (assertion), boot time'da (env var check). **Sessiz fallback yapma**.

### 1.6. **Boundary Clarity**
Her modül/package'ın **public API'si** net olmalı. Internal helpers `_` prefix veya `internal/` klasörde. `index.ts` dosyaları export contract'ı tanımlar.

---

## 2. Clean Architecture & Katman Disiplini

Niyet 5 katmana bölünür. **Üst katman alt katmana bağımlı, tersi değil**.

```
┌─────────────────────────────────────────────────┐
│  Layer 5: UI (apps/web)                          │ ← React Components, pages
├─────────────────────────────────────────────────┤
│  Layer 4: Application (apps/web/lib + graphql)   │ ← Use cases, GraphQL resolvers
├─────────────────────────────────────────────────┤
│  Layer 3: Domain (packages/core)                 │ ← Pure business logic, types, rules
├─────────────────────────────────────────────────┤
│  Layer 2: Infrastructure (packages/db, ai)       │ ← DB, external APIs (Gemini, Supabase)
├─────────────────────────────────────────────────┤
│  Layer 1: Platform (Next.js, Vercel, Supabase)  │ ← Runtime, framework
└─────────────────────────────────────────────────┘
```

### Bağımlılık Yönü Kuralı
- **UI** → Application → Domain → Infrastructure → Platform
- **Domain** asla `apps/web`'i import etmez (UI agnostic)
- **Infrastructure adapter pattern**: `packages/ai` Gemini'yi soyutlar, yarın Claude'a geçilebilir
- **DB seviyesi business logic'i yok**: Prisma raw queries minimum, hesaplar `packages/core`'da

### Hexagonal / Ports & Adapters
```
Application Layer
       │
       │ depends on (interface)
       ▼
┌─────────────────────────┐
│   Domain Port           │  ← interface tanımı
│   AIProvider {          │
│     analyzeTransactions │
│   }                     │
└────────────▲────────────┘
             │ implements
   ┌─────────┴──────────┐
   │ Gemini Adapter     │  ← packages/ai
   │ (gerçek)           │
   └────────────────────┘
   ┌────────────────────┐
   │ Mock Adapter       │  ← packages/ai/__mocks__
   │ (test için)        │
   └────────────────────┘
```

---

## 3. SOLID Prensipleri (Pratik Uygulama)

### S — Single Responsibility
Bir function/class/module **bir** değişme nedenine sahip olmalı.

```ts
// Kötü: Çok sorumluluk
class TransactionService {
  async createTx() { /* DB write */ }
  async sendNotification() { /* SMS */ }
  async logToAnalytics() { /* metrics */ }
}

// İyi: Ayrı sorumluluklar
class TransactionRepository { /* DB */ }
class NotificationService { /* notifications */ }
class AnalyticsLogger { /* metrics */ }
```

### O — Open/Closed
Yeni davranış için kapalı entity'yi değiştirme, **extension** ile ekle.

```ts
// Kötü: Yeni provider eklemek için existing function'ı düzenle
function analyze(tx) {
  if (provider === 'gemini') { /* ... */ }
  else if (provider === 'openai') { /* ... */ }
}

// İyi: Strategy pattern
interface AIProvider { analyze(tx): Promise<Result> }
class GeminiProvider implements AIProvider { /* ... */ }
class OpenAIProvider implements AIProvider { /* ... */ }
```

### L — Liskov Substitution
Subtype'lar supertype'ın yerini **sürpriz** yapmadan tutabilmeli. Interface'lere uyumlu davranış.

### I — Interface Segregation
İstemcileri kullanmadıkları metodlara bağlama. Büyük interface'leri **küçük, role-based** interface'lere böl.

```ts
// Kötü: Şişman interface
interface Repository {
  findById(); create(); update(); delete(); bulkInsert(); softDelete(); /* ... */
}

// İyi: Role'e göre küçük
interface Reader { findById() }
interface Writer { create(); update() }
```

### D — Dependency Inversion
Üst seviye modüller alt seviye modüllere değil, **soyutlamalara** bağımlı olmalı.

```ts
// İyi: resolver Gemini'ye değil AIProvider'a bağımlı
class RunAnalysisUseCase {
  constructor(private ai: AIProvider, private repo: TransactionRepository) {}
}
```

---

## 4. Type-Driven Design

TypeScript'i sadece "JavaScript + tipler" olarak değil **tasarım aracı** olarak kullan.

### 4.1. Make Illegal States Unrepresentable
```ts
// Kötü: Geçersiz state mümkün
type Goal = {
  status: string;
  reachedAt?: Date;
  pausedReason?: string;
};

// İyi: Discriminated union ile geçersiz state imkansız
type Goal =
  | { status: 'ACTIVE' }
  | { status: 'PAUSED'; pausedReason: string }
  | { status: 'ACHIEVED'; reachedAt: Date };
```

### 4.2. Branded Types for Domain IDs
```ts
type UserId = string & { __brand: 'UserId' };
type TransactionId = string & { __brand: 'TransactionId' };

function getUser(id: UserId) { /* ... */ }
getUser('123'); // Type error — düz string kabul edilmez
```

### 4.3. Zod for Boundary Validation
Tüm **harici sınırlar** (HTTP request, ENV vars, AI response) Zod ile parse edilir:

```ts
const TransactionSchema = z.object({
  id: z.string().uuid(),
  amount: z.coerce.number().positive(),
  occurredAt: z.coerce.date(),
});
type Transaction = z.infer<typeof TransactionSchema>;
```

### 4.4. `never` Exhaustiveness Check
Switch'lerde tüm case'lerin handle edildiğini compile-time'da garantile:

```ts
function categoryIcon(cat: SpendingCategory): string {
  switch (cat) {
    case 'COFFEE': return '☕';
    case 'MARKET': return '🛒';
    // ... 15 case
    default: const _exhaustive: never = cat; return _exhaustive;
  }
}
```

---

## 5. Domain-Driven Design (Light)

Tam DDD overkill ama bazı prensipler değerli:

### 5.1. Ubiquitous Language
Kodda kullanılan domain terimleri **business diliyle aynı** olmalı:
- `Transaction` (banka jargonu)
- `Subscription`
- `MicroContribution`
- `FutureScore` (ürün dili)
- `Record` (kötü: generic, anlamsız)

### 5.2. Bounded Contexts
Niyet 5 bounded context'i:
1. **Spending Context**: Transaction, Account, BankConnection, Category, Subscription
2. **Savings Context**: Rule, MicroContribution, Goal, GoalCheckpoint
3. **Social Context**: Circle, CircleMembership
4. **Engagement Context**: FutureScore, Notification, Achievement
5. **AI Context**: AnalysisRun, TransactionAnalysis

Her context kendi sub-module'ünde yaşar; cross-context iletişim **event'ler** veya **explicit query'ler** ile.

### 5.3. Aggregate Roots
- `User` aggregate root: alt entity'ler (Accounts, Rules, Goals, Circles) buradan erişilir
- `Transaction` ayrı root: çok fazla; queries genelde flat tablo üzerinden
- `Goal` ayrı root: GoalCheckpoint'leri owner

---

## 6. Hata Yönetimi & Defensive Programming

### 6.1. Result Pattern (Exception kullanmaktan kaç)
```ts
// Kötü: Exception throwing herkesi sürpriz eder
async function fetchTx(id: string) {
  const tx = await db.tx.findUnique({ id });
  if (!tx) throw new Error('Not found');
  return tx;
}

// İyi: Result type — caller karar verir
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

async function fetchTx(id: string): Promise<Result<Transaction, 'NOT_FOUND'>> {
  const tx = await db.tx.findUnique({ id });
  return tx ? { ok: true, value: tx } : { ok: false, error: 'NOT_FOUND' };
}
```

### 6.2. Domain Error vs Infrastructure Error Ayır
- **Domain error**: business rule violation (örn: "Goal target negative") → kullanıcıya göster
- **Infrastructure error**: DB down, Gemini timeout → retry/fallback + alert

### 6.3. Asla Sessiz Fallback Yapma
```ts
// Kötü: Hata yutulur, kimse bilmez
try { await analyze(); } catch { return defaultResult; }

// İyi: Hata logla, retry, sonra yönet
try { await analyze(); }
catch (e) {
  logger.error('AI analyze failed', { error: e, userId });
  if (isTransient(e)) return retry();
  throw new DomainError('AI_UNAVAILABLE');
}
```

### 6.4. Boundary Validation Zorunlu
- Tüm HTTP/GraphQL request input'u Zod ile parse
- Tüm env vars Zod ile parse (boot time)
- Tüm AI response (function call args) Zod ile parse

---

## 7. Test Disiplini

### 7.1. Test Pyramid
```
       /\
      /E2E\        ← 5%  (kritik happy path)
     /------\
    / Integ  \     ← 15% (GraphQL resolver + Prisma + Supabase)
   /----------\
  /   Unit     \   ← 80% (pure functions, business logic)
 /--------------\
```

### 7.2. Unit Test İlkeleri
- **Fast** (<10ms per test): mock yok, DB yok, network yok
- **Independent**: test order matter etmez
- **Deterministic**: random/time fake'lenmiş (vi.useFakeTimers, seeded RNG)
- **One assertion focus**: birden fazla `expect` aynı concept'i doğrulamalı

### 7.3. Test as Documentation
```ts
describe('FutureScore', () => {
  describe('contribution sub-score', () => {
    it('düzenli haftalık katkı için 100/100 verir', () => { /* ... */ });
    it('hiç katkı yapmamış kullanıcıya 0 verir', () => { /* ... */ });
    it('aylık 1 katkı yapan kullanıcıya 40 verir', () => { /* ... */ });
  });
});
```

### 7.4. AI Testleri (Snapshot-based)
- Gemini deterministic değil → exact equal yerine **schema validation + invariant check**
- Recorded fixtures ile replay: `__fixtures__/gemini-responses/`
- Eval suite: 20 örnek transaction üzerinde "kategori doğru mu?" ground truth

---

## 8. Observability (Logging, Metrics, Tracing)

### 8.1. Structured Logging
JSON formatted logs, never raw `console.log`. Logger: `pino` veya basit wrapper.

```ts
logger.info('runAnalysis.started', { userId, txCount: 300 });
logger.warn('gemini.retry', { attempt: 2, reason: 'timeout' });
logger.error('runAnalysis.failed', { userId, error: serializeError(e) });
```

### 8.2. Metrics
Demo aşamasında manuel; production aşamasında PostHog veya Vercel Analytics:
- `analysis_run_duration_ms` (histogram)
- `analysis_run_total` (counter, success/failure label)
- `gemini_token_usage` (sum)
- `transaction_category_edited_count` (counter — yanlış kategoriye sinyal)

### 8.3. Distributed Tracing (light)
Her request'e `requestId` ata, tüm log'larda taşı. Üst seviye span: HTTP request, GraphQL operation, Gemini call, DB query.

### 8.4. PII (Personally Identifiable Information) Sansürü
Log'larda **kullanıcı adı, email, transaction tutar, merchant** asla plain çıkmaz. `userId` (cuid) OK; daha hassas alanlar `[REDACTED]`.

---

## 9. Performance Budget

### 9.1. Hedefler (Demo)
| Metric | Budget |
|---|---|
| FCP (First Contentful Paint) | < 1.5s |
| TTI (Time to Interactive) | < 3s |
| `dashboard` GraphQL query | < 200ms (P95) |
| `runAnalysis` mutation | < 5s (P95) |
| Bundle size (initial JS) | < 250KB gzipped |
| Realtime event latency | < 1s |

### 9.2. Pratikler
- **Server Components default**: Sadece interactivity gerekenlerde `'use client'`
- **Dynamic import**: Heavy components (`Recharts`, chatbot) lazy
- **Image optimization**: Next.js `<Image>` (zaten built-in)
- **DB indexing**: `Transaction(userId, occurredAt)`, `Transaction(userId, category)` index'li
- **Query select projection**: Sadece UI'ın ihtiyacı kadar field çek (Prisma `select`)
- **N+1 önle**: GraphQL DataLoader pattern (Pothos Prisma plugin otomatik halleder)

### 9.3. Monitoring
- Vercel Speed Insights aktif
- Lighthouse CI (opsiyonel, Faz 8'de)

---

## 10. Güvenlik by Design

(Detay: `SECURITY.md`)

- **Secrets** asla repoda; `.env.example` placeholder ile
- **RLS policy'leri** her tabloda; `auth.uid() = userId` filtresi
- **Service role key** sadece server context; client'a sızmaz
- **SQL injection imkansız**: Prisma parameterize query'ler kullanır
- **XSS imkansız**: React JSX auto-escape; raw HTML injection (örn. `d4ngerouslySetInnerHTML` benzeri prop) yasak; gerekirse kod review
- **CSRF**: SameSite cookie + Next.js Server Actions CSRF token
- **Rate limiting** (production): `/api/graphql` endpoint'inde
- **Audit log**: Kritik mutations (`acceptSavingOpportunity`, `editTransactionCategory`) DB'de log'lanır

---

## 11. 12-Factor App Uyumu

| Faktör | Uygulama |
|---|---|
| **I. Codebase** | Tek repo, çoklu deploy (preview + prod) |
| **II. Dependencies** | `package.json` declared, `bun.lockb` pinned |
| **III. Config** | Env vars (`.env.local` local, Vercel env prod) |
| **IV. Backing services** | Supabase URL config-driven; başka Postgres da çalışır |
| **V. Build, release, run** | Turborepo build → Vercel deploy ayrılığı |
| **VI. Processes** | Stateless Next.js processes; state Supabase'de |
| **VII. Port binding** | Vercel managed |
| **VIII. Concurrency** | Vercel serverless; stateless scale |
| **IX. Disposability** | Hızlı start (cold start <500ms hedefi) |
| **X. Dev/prod parity** | Dev'de aynı Supabase proje (separate schema veya separate project) |
| **XI. Logs** | stdout → Vercel logs (production'da log aggregator'a forward) |
| **XII. Admin processes** | `bun db:migrate`, `bun db:seed` one-off scripts |

---

## 12. Agentic AI Mimarisi

> Niyet'in AI tarafı sadece "prompt → text" değil; **agentic** — yani **plan eden, tool çağıran, multi-step reasoning yapan** bir yapı kurulur.

### 12.1. Agent Loop Pattern
```
┌─────────────────────────────────────────────────────────────┐
│                       Agent Loop                            │
│                                                             │
│   ┌─────────┐                                               │
│   │ Goal /  │                                               │
│   │ Intent  │──────► Planner ─────► Tool Selection          │
│   └─────────┘                              │                │
│                                            ▼                │
│                                       ┌─────────┐           │
│                                       │ Execute │           │
│                                       │  Tool   │           │
│                                       └────┬────┘           │
│                                            │                │
│                                            ▼                │
│   ┌────────────────┐                  ┌─────────┐           │
│   │ Stop condition │◄─────────────────┤ Observe │           │
│   │ (success/limit)│                  │ Result  │           │
│   └────────────────┘                  └────┬────┘           │
│           │                                │                │
│           │ No                             │ (continue)     │
│           └────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────┘
```

### 12.2. Niyet'te Kullanılacak Agentic Pattern'lar

#### Pattern A: Spending Analyzer Agent
**Goal**: "Kullanıcının son 90 günlük harcamasını analiz et, kategorize et, azaltılabilir olanları bul, aboneliği tespit et, mikro tasarruf öner."

**Tools** (Gemini Function Calling):
- `set_transaction_category(tx_id, category, reasoning)`
- `mark_as_subscription(tx_id, frequency, reasoning)`
- `flag_reducible(tx_id, reducible_amount, reasoning)`
- `recommend_micro_saving(category, amount, period, reasoning)`

**Loop**: Gemini batch transaction'lar üzerinde her transaction için 0-N tool call yapar. Backend executor her call'ı handle eder. Single-shot ama tool-rich.

#### Pattern B: AI Saving Coach (Conversational Agent)
**Goal**: Chatbot — kullanıcı serbest doğal dilde sorar; agent bağlama göre cevap verir, gerekirse tool çağırır.

**Tools**:
- `get_user_spending_summary(period)` — DB'den özet çek
- `get_user_goals()` — aktif hedefler
- `simulate_savings_plan(monthly_amount, goal_id)` — hesap motoru
- `create_saving_rule(label, amount, frequency)` — kullanıcı onayıyla rule oluştur
- `recommend_subscription_to_cancel()` — kullanılmayan abonelik öner

**Loop**: Multi-turn conversation. Her turn'de:
1. Kullanıcı mesajı + history Gemini'ye gider
2. Gemini tool call yapabilir (örn: önce summary çek, sonra cevapla)
3. Tool result yeni context olarak Gemini'ye geri verilir
4. Final response kullanıcıya stream edilir

#### Pattern C: Goal Forecasting Agent
**Goal**: Kullanıcının hedef bilgisi + enflasyon verisi + mevcut katkı oranı → "Bu hedefe X tarihte ulaşırsın" projection.

**Tools**:
- `fetch_inflation_data()` — TÜFE/ÜFE (mock veya gerçek API)
- `fetch_price_history(goal_name)` — örn: "yeni MacBook" güncel fiyat
- `compute_future_value(base, monthly, years, inflation)` — finansal hesap
- `notify_milestone_reached(goal_id, percent)` — backend trigger

#### Pattern D: Future Score Updater Agent (Background)
**Goal**: Kullanıcının davranışsal disiplin skorunu hesapla ve güncelle.

**Tools**: Sub-score calculators (contribution, discipline, consistency, social). Pure functions, AI değil ama agent **pattern** olarak organize edilir (planner + executor).

### 12.3. Agent Design Principles

- **Bounded autonomy**: Agent **kullanıcı onayı olmadan** yatırım kararı vermez, para hareket ettirmez. Tools sadece **öneri** üretir; commit kullanıcıdan gelir.
- **Transparency**: Her agent call'ı `AnalysisRun` veya `AgentCall` tablosuna log'lanır — request, response, durationMs, toolsCalled.
- **Fallback**: Agent loop max 5 iteration; aşılırsa "Şu an analiz edemiyorum, daha sonra tekrar dene" döner.
- **Cost cap**: Her user session başına token bütçesi (örn: 50K token/gün). Aşılırsa rate limit.
- **Determinism (mümkün olduğunca)**: Temperature 0.3, top_p 0.9. Aynı input ~aynı output beklenir.

### 12.4. Agent vs Pipeline Ayrımı
- **Pipeline**: Fixed sıralı adımlar (örn: fetch → analyze → store). Tool ihtiyacı yok.
- **Agent**: AI plana göre tool seçer ve sırayı dinamik kurar. Niyet'te **Pattern B (Coach)** gerçek agent; A,C,D pipeline + tool calling karışımı.

---

## 13. AI Doğruluk ve Performans Güvenceleri

### 13.1. Output Validation Pipeline
```
Gemini response
      │
      ▼
[Zod parse] ──── fail ───► retry / fallback / log
      │ pass
      ▼
[Domain rule check]      (örn: category enum'da mı? amount > 0?)
      │ pass
      ▼
[Sanity check]           (örn: total opportunity ≤ total spending?)
      │ pass
      ▼
[Persist to DB]
```

### 13.2. Prompt Engineering Disiplini

#### System Prompt Yapısı
```
1. ROL: "Sen Niyet'in harcama analizi uzmanısın..."
2. AMAÇ: "...kullanıcının azaltılabilir harcamalarını tespit edeceksin"
3. ARAÇLAR: "Şu fonksiyonları çağırabilirsin: [...]"
4. KISITLAR: "Yatırım tavsiyesi VERME; kullanıcının yerine karar VERME; yalnızca öneri ÜRET"
5. ÖRNEK (few-shot, 2-3 örnek)
6. ÇIKTI FORMATI: "Her transaction için en fazla 1 set_category call; abonelik kesin tespitlerde mark_as_subscription"
```

#### Few-Shot Örnekler
```
[Input] Transaction: { merchant: "Starbucks", amount: 95, occurredAt: "..." }
[Expected]
- set_transaction_category(tx_id, "COFFEE", "Starbucks kahvehane zinciri")
- flag_reducible(tx_id, 50, "Bu fiyatta ev kahvesi ~10₺; 85% reducible")
```

#### Prompt Versiyonlama
`packages/ai/src/prompts/v1/`, `v2/`. Her prompt değişiminde version artar. A/B test için ön hazırlık.

### 13.3. Evaluation Suite

`packages/ai/evals/` altında:
- 20 örnek transaction set'i (ground truth ile)
- "Doğru kategori atadı mı?" — accuracy metric
- "Abonelikleri eksiksiz buldu mu?" — recall metric
- "False positive subscription var mı?" — precision metric
- "Önerilen tasarruf tutar makul mü?" — sanity check (kural-tabanlı)

Run: `bun --filter @niyet/ai eval`. Sonuç bir markdown raporu üretir.

### 13.4. Latency Optimization
- **Batch processing**: 300 transaction tek call'da (token-efficient, latency-efficient)
- **Streaming**: Chatbot için stream response → kullanıcı bekleme hissi azalır
- **Cache**: Aynı user için son 1 saatte AnalysisRun varsa, "Re-analyze" tıklanmadıkça cache döner
- **Parallel where possible**: AI Coach tool call'ları paralelize edilebilirse (DataLoader pattern)

### 13.5. Cost Tracking
- Her `AnalysisRun` ve `AgentCall` token usage'ı kayıt eder (`promptTokens`, `completionTokens`)
- Günlük rapor: en pahalı user, en pahalı operation type
- Cost cap: User başına günlük 100K token

### 13.6. Hallucination Mitigation
- **Grounding**: Gemini'ye **mevcut transaction listesi** verilir; uydurma transaction yaratamaz
- **Constrained generation**: Function call schema'lar Zod ile validate
- **Confidence threshold**: Gemini "reasoning" alanı varsa kullanıcıya gösterilir (transparency)
- **Manual override**: Kullanıcı her zaman kategoriyi düzeltebilir → `categoryEdited: true` field'ı feedback loop

---

## 14. Code Review Disiplini

### 14.1. PR Author Checklist
Her PR açan kişi merge öncesi:
- [ ] Self-review yaptım (kendi diff'imi gözden geçirdim)
- [ ] Test ekledim (yeni davranış için)
- [ ] Type-check + lint + test local'de geçiyor
- [ ] Doc güncelledim (gerekirse)
- [ ] Commit message Conventional Commits formatında
- [ ] Breaking change varsa migration yolu açık

### 14.2. Reviewer Checklist
Reviewer:
- [ ] PR amacını anladım
- [ ] Boundary clarity korunuyor (modül sızıntısı yok)
- [ ] Naming açık ve domain language'ine uygun
- [ ] Error handling sessiz fallback değil
- [ ] Test coverage yeni davranışı kapsıyor
- [ ] Performance regression riski yok
- [ ] Security riski yok (secret, XSS, SQLi, ...)

### 14.3. Code Review Tonu
- Sorular sor, dayatma yapma ("Bunu neden böyle yaptın?" yerine "X yaklaşımı denedin mi?")
- Pozitif feedback de ver ("Bu çok iyi soyutlanmış!")
- Trivial nit'leri `nit:` prefix ile blok değil, kabul edilebilir
- Architectural feedback'i blok et ("blocker:") — merge'ü tutar
- Maksimum 24 saat içinde review (CI yeşilse)

---

## 15. Documentation as Code

### 15.1. Doc Çeşitleri
- **README**: 5 dk setup için
- **CLAUDE.md**: AI asistanın projeyi anlaması için
- **HANDOFF.md**: Yeni ekip üyesi için
- **ARCHITECTURE.md**: Sistem mimarisi
- **MEMORY.md**: ADR log (decision history)
- **ENGINEERING.md**: Bu dosya — prensipler
- **SECURITY.md**: Güvenlik
- **CONTRIBUTING.md**: Süreç

### 15.2. Inline Doc Kuralları
- JSDoc karmaşık API'lerde (özellikle `packages/core` public function'larda)
- Why > What: kod ne yapar (apaçık) değil **neden** öyle yapar
- TODO'lar issue/ticket linki ile birlikte (`// TODO(#42): rate limit eklenecek`)
- Magic number'ları named constant'la değiştir (`const COFFEE_AVG_ESTIMATE_TRY = 10`)

### 15.3. Doc Maintenance
- PR'larda dokuman güncellemesi check'i
- Quarterly doc review (her 3 ay bir, doc'ları gözden geçir)
- "Stale" tag'le güvenilmez bölümleri işaretle, refaktor sırasında temizle

---

## 16. Anti-Pattern'lar (Kaçınılacaklar)

| Anti-Pattern | Neden Kötü | Yerine |
|---|---|---|
| **God Object** (her şeyi bilen mega class) | Test edilemez, değiştirilemez | Sınırlı sorumluluk, küçük sınıflar |
| **Stringly-typed** (her şey string) | Compile-time hata yakalanamaz | Enum, branded types, Zod |
| **Anemic Domain Model** (sadece DB row, davranış yok) | Logic her yere dağılır | Domain method'ları |
| **Boolean param flag** (`doSomething(true, false)`) | Call site okunmaz | Enum veya ayrı method |
| **Premature Abstraction** | Yanlış soyutlama düzeltilmesi pahalı | Üç tekrar bekle |
| **Comment Rot** (kod değişir comment kalır) | Yanıltıcı | Comment yerine ifadeli kod; doc test gibi |
| **Catch-and-swallow** (`catch(e) { }`) | Sessiz hata | Log + retry + rethrow |
| **Mutable shared state** (global var, singleton) | Test paralel çalışamaz | Dependency injection |
| **Magic numbers/strings** (`if (x > 7)`) | Anlam belirsiz | Named constants |
| **Long parameter list** (5+ args) | Call site karmaşık | Options object veya builder |
| **Deep nesting** (4+ if/for derinliği) | Okunmaz | Early return, extract function |
| **Copy-paste programming** | DRY ihlali | Refactor, parametre çıkar |
| **Synchronous in async land** (long-running CPU) | Event loop blocker | Background job veya Worker |

---

## Kapanış

Bu doküman **canlı bir manifestodur** — proje büyüdükçe öğrendiklerimizi buraya ekleriz. Bir prensip bizi yavaşlatıyorsa ADR ile gerekçeli güncelleriz, sessizce ihmal etmeyiz.

**Niyet'in mühendislik üstünlüğü, kendi sürekliliğimize verilen sözdür.**
