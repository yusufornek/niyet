# CLAUDE.md — Niyet Projesi için AI Asistan Rehberi

Bu dosya, Claude Code (veya başka AI kodlama asistanları) bu repo üzerinde çalışırken **projeyi nasıl anlaması ve hangi kurallara uyması gerektiğini** anlatır. Yeni ekip üyesi açısından da hızlı bir oryantasyon dokümanıdır.

---

## Proje Özeti (1 paragraf)

Niyet, Türk genç kullanıcılar (özellikle 18-35 yaş) için tasarlanmış **AI destekli mikro emeklilik platformu**. Kullanıcının banka/kart hareketlerini analiz eder, azaltılabilir harcamaları (kahve, abonelik, yemek siparişi vs.) tespit eder ve bu mikro tasarrufları emeklilik katkısına dönüştürür. Şu anda yarışma demo aşamasında: **gerçek banka entegrasyonu yok, mock data + Gemini AI ile uçtan uca akış**.

---

## Çalışma Prensipleri

### Türkçe yanıt ver
Tüm açıklamalar, commit mesajları açıklamaları, UI metinleri Türkçe. Kod identifier'ları (variable/function isimleri) İngilizce kalır.

### Yüksek mühendislik, pragmatic teslim
**Mühendislik kalitesi en üst öncelik**. Bu projenin temelini sağlam atmak, ekibin tüm geliştirme sürecini hızlandırır. `ENGINEERING.md` dokümanı **canlı manifesto** — her PR ve tasarım kararı bu prensiplere göre değerlendirilir:

- **Clean Architecture** + katman disiplini (UI → Application → Domain → Infrastructure)
- **SOLID** + **Type-Driven Design** (illegal states unrepresentable, branded types, Zod boundary validation)
- **Agentic AI** pattern'ları (planner + tool selection + executor loop, bounded autonomy, transparency)
- **AI doğruluk güvenceleri** (output validation, eval suite, hallucination mitigation, prompt versioning)
- **Observability** (structured logging, metrics, distributed tracing light)
- **Performance budget** (FCP <1.5s, P95 dashboard <200ms, P95 runAnalysis <5s)
- **Security by Design** (RLS, Zod validation, secrets server-only, KVKK uyumu)
- **Test pyramid** (80% unit, 15% integration, 5% e2e)

Demo zamanı kısıtlı **ama** "çalışan kod" yeterli değil — "doğru çalışan, anlaşılabilir, değiştirilebilir, ölçülebilir kod" hedefimiz. **YAGNI** ile dengeli: ihtiyacı kanıtlanmamış soyutlama üretme.

Detay: [`ENGINEERING.md`](./ENGINEERING.md) (16 bölüm).

### "Gerçek banka yok" ama "gerçek AI var"
- `BankConnection` modeli mock — adapter pattern ile ileride gerçeğe geçer
- Gemini API çağrıları **gerçek** — function calling, retry, cache hepsi gerçek
- Mock data jüri demosu için tutarlı ve gerçekçi olmalı

---

## Dosya Yapısı Anlam Haritası

```
apps/web/              # Next.js 15 App Router — kullanıcı arayüzü + GraphQL endpoint
  app/(auth)/          # Public routes (login, signup, consent)
  app/(app)/           # Protected routes (dashboard, radar, goals, ...)
  app/api/graphql/     # GraphQL Yoga handler
  components/          # Custom + shadcn/ui components
  lib/                 # Supabase clients, GraphQL client, Zustand stores

packages/db/           # Tek sahiplik: Prisma schema, migrations, seed
packages/graphql/      # Tek sahiplik: GraphQL schema (Pothos), resolvers
packages/ai/           # Tek sahiplik: Gemini client, prompts, function definitions
packages/core/         # Cross-cutting: Zod types, kategori enum, business logic
packages/config/       # Shared ESLint/TS/Tailwind preset'leri
```

**Kural**: Bir package değiştiğinde diğer paketlerin imports'ları kırılmamalı. Public API'lerin `index.ts` üzerinden export edilir.

---

## Sık Kullanılan Komutlar (kopyala-çalıştır)

```bash
bun dev                  # Tüm workspace dev mode
bun --filter @niyet/web dev   # Sadece web app
bun db:studio            # Prisma Studio (DB visual)
bun db:reset             # DB sıfırla + seed
bun lint && bun type-check && bun test    # Pre-push gate manual
```

---

## Kod Konvansiyonları

### TypeScript
- **Strict mode açık**, `any` kullanma (zorunluysa `unknown` + narrow et)
- Type ve Interface: domain modelleri için `interface`, props/state için `type`
- Zod ile runtime validation: `packages/core/src/types.ts` paylaşımlı schema'lar

### React / Next.js
- **Server Components default** — `'use client'` sadece interactivity gerekirse
- Form'lar: `react-hook-form` + Zod resolver
- Data fetching:
  - Server Component → doğrudan Prisma veya Supabase
  - Client Component → TanStack Query + GraphQL request
- Routing: file-based, **react-router-dom asla kullanma**

### Styling
- Tailwind utility-first
- shadcn/ui primitives `components/ui/`'da, **bunları manuel düzenleme** — yeniden generate et
- Custom design token'lar `globals.css`'te HSL CSS değişkenleri olarak
- Mobile-first responsive: `sm:`, `md:`, `lg:` prefix'leriyle expand

### Naming
- Files: `kebab-case.tsx` for components, `camelCase.ts` for utilities
- Components: `PascalCase`
- Hooks: `useFooBar` (camelCase, `use` prefix)
- Constants: `SCREAMING_SNAKE_CASE`
- Türkçe identifier kullanma (kod İngilizce kalır)

### GraphQL (Pothos)
- Code-first: `packages/graphql/src/schema/`'da type tanımları
- Her domain için ayrı dosya: `transaction.ts`, `goal.ts`, `circle.ts`
- Mutation'lar Zod ile input validate eder
- Authorization Pothos auth-scopes plugin ile

---

## "Buralara Dokunma" Listesi

| Dosya/klasör | Neden |
|---|---|
| `apps/web/components/ui/*` | shadcn/ui generated — manuel düzenleme yerine `npx shadcn@latest add` ile re-generate |
| `apps/web-legacy/*` | Eski Vite mockup, sadece referans. Yeni kod oraya yazma |
| `packages/db/prisma/migrations/*` | Migration dosyaları immutable. Schema değişirse yeni migration üret |
| `bun.lockb` | Bun lockfile — manuel düzenlenmez |

---

## Tipik Görev Yönergeleri

### "Yeni bir ekran ekle" istendiğinde
1. `apps/web/app/(app)/<slug>/page.tsx` oluştur
2. Var olan `apps/web-legacy/src/screens/` içinden ilgili screen kodunu referans al
3. PhoneShell ile sar
4. Veriyi GraphQL Query ile çek: `useGraphQLQuery` hook'u
5. shadcn/ui primitive'leri kullan
6. Türkçe metinler doğrudan JSX'te (i18n şimdilik yok)

### "Yeni bir DB tablo/field ekle" istendiğinde
1. `packages/db/prisma/schema.prisma` düzenle
2. `bun db:migrate` çalıştır (migration dosyası üretilir)
3. Pothos schema'yı güncelle: `packages/graphql/src/schema/<entity>.ts`
4. Gerekirse Zod type'larını paylaşımlı `packages/core/src/types.ts`'e ekle

### "Gemini'ye yeni bir analiz tipi ekle" istendiğinde
1. `packages/ai/src/functions/` altında yeni function definition
2. System prompt'u güncelle (`packages/ai/src/prompts/`)
3. `runAnalysis` pipeline'ı function'ı handler map'e ekler
4. Function call result'u DB'ye yaz (yeni `TransactionAnalysis` field veya yeni model)

### "UI'da yeni shadcn component ihtiyacı varsa"
```bash
cd apps/web && bunx shadcn@latest add <component-name>
```

---

## Önemli Kararlar (Detayı `MEMORY.md`'de)

- **Next.js + Vercel**: Jüri web link demosu için optimum
- **Supabase**: DB + Auth + Realtime tek yerde, hızlı setup
- **Prisma**: Schema-first, otomatik type, DX iyi
- **GraphQL (Pothos)**: Type-safe code-first, ileride RN için aynı schema
- **Gemini 2.5 Flash + Function Calling**: Maliyet/kalite optimum, structured output
- **Feature-branch + Manuel merge**: Proje sahibi main'e ne girdiğini explicit onayla kontrol eder (Conventional Commits, squash-merge)
- **Türkçe-only şimdilik**: Demo için pragmatic

---

## Test Yaklaşımı

- **Unit (Vitest)**: Business logic (kategori map, future score hesabı, savings opportunity)
- **E2E (Playwright)**: 1-2 critical happy path (Onboarding → Connect → Dashboard → Analiz)
- **Manual smoke**: Her merge sonrası Vercel preview'da gözden geçir
- **Coverage hedefi**: Yok. "İşe yarar test" > "yüksek coverage"

---

## Gönderim/Demo Hazırlığı (Faz 8)

Demo öncesi checklist:
- [ ] Vercel production deploy yeşil
- [ ] Custom domain (varsa)
- [ ] Demo user (Ayşe) seed'lenmiş, login bypass çalışıyor
- [ ] Tüm 9 epic'in temel akışı çalışıyor
- [ ] Gemini API key'i quota yeterli
- [ ] README ve HANDOFF güncel
- [ ] Yarışma teslim formundaki linkleri kontrol et

---

## İletişim

- **Repository**: <https://github.com/yusufornek/niyet>
- **Proje sahibi**: Yusuf (`@yusufornek`)
