# Niyet

> **AI Destekli Mikro Emeklilik ve Birikim Alışkanlığı Platformu**
> _Harcamadığını geleceğine aktar._

Niyet, kullanıcının kredi kartı ve banka hareketlerini izinli şekilde analiz ederek azaltılabilir harcamaları tespit eden, bu mikro tasarrufları uzun vadeli emeklilik katkısına dönüştüren mobil-öncelikli bir davranışsal fintech platformudur.

> **Demo aşamasında**: Yasal hazırlıklar nedeniyle gerçek banka entegrasyonu yok. Mock data + Gemini AI ile uçtan uca akış simüle ediliyor.

---

## Hızlı Başlangıç

### Önkoşullar

- [Bun](https://bun.sh) ≥ 1.1
- Node.js ≥ 20 (Vercel runtime için)
- [Supabase](https://supabase.com) hesabı (DB + Auth)
- [Gemini API key](https://aistudio.google.com/app/apikey)
- RapidAPI product search key (hedef fiyat takibi için)

### Setup

```bash
# 1. Dependencies
bun install

# 2. Environment variables
cp .env.example .env.local
# .env.local dosyasını doldur (Supabase URL'leri, Gemini key, RapidAPI key, ...)

# 3. Database
bun db:generate    # Prisma client üretir
bun db:migrate     # Migration çalıştırır
bun db:seed        # Ayşe persona + 90 gün mock data

# 4. Dev server
bun dev
```

Tarayıcıda: <http://localhost:3000>

### Sık Kullanılan Komutlar

| Komut            | Açıklama                           |
| ---------------- | ---------------------------------- |
| `bun dev`        | Tüm paketleri dev mode'da çalıştır |
| `bun build`      | Production build                   |
| `bun lint`       | ESLint tüm workspace               |
| `bun type-check` | TypeScript tip kontrolü            |
| `bun test`       | Vitest unit test'leri              |
| `bun test:e2e`   | Playwright e2e                     |
| `bun db:studio`  | Prisma Studio (DB visual editor)   |
| `bun db:reset`   | DB'yi sıfırla ve yeniden seed et   |
| `bun format`     | Prettier ile tüm kod biçimle       |

---

## Proje Yapısı

```
niyet/
├── apps/
│   ├── web/              # Next.js 15 App Router (primary)
│   └── web-legacy/       # Eski Vite mockup (referans)
├── packages/
│   ├── db/               # Prisma schema + migrations + seed
│   ├── graphql/          # Pothos + Yoga GraphQL layer
│   ├── ai/               # Gemini integration + function calling
│   ├── core/             # Shared business logic (web+mobile)
│   └── config/           # ESLint, TS, Tailwind preset'leri
├── docs/                 # Project briefs (PDF/CSV)
└── ...
```

Detaylı mimari için [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Teknoloji Stack'i

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS + Recharts
- **State**: Zustand (UI) + TanStack Query (server)
- **Backend**: Next.js API Routes + GraphQL (Pothos + Yoga)
- **Database**: Supabase PostgreSQL + Prisma ORM
- **Auth**: Supabase Auth (email + OAuth)
- **Realtime**: Supabase Realtime (DB events)
- **AI**: Gemini 2.5 Flash + Function Calling
- **Monorepo**: Turborepo + Bun workspaces
- **Test**: Vitest (unit) + Playwright (e2e)
- **Deploy**: Vercel (auto-preview + production)

Karar gerekçeleri için [HANDOFF.md](./HANDOFF.md), [MEMORY.md](./MEMORY.md) (ADR log), ve mühendislik prensipleri için [ENGINEERING.md](./ENGINEERING.md).

---

## Katkıda Bulunma

[CONTRIBUTING.md](./CONTRIBUTING.md) dokümanına bakın. Özetle:

- **Branching**: Feature-branch + manuel merge. Her özellik/faz kendi branch'inde geliştirilir; proje sahibi explicit onay ile main'e geçer (squash-merge).
- **Commits**: [Conventional Commits](https://www.conventionalcommits.org/) (feat:/fix:/docs:/...)
- **CI gate'leri**: lint + type-check + test her push'ta çalışır.

---

## Güvenlik

KVKK uyumu, secrets management, ve veri koruma için [SECURITY.md](./SECURITY.md).

---

## Lisans

Proprietary — Yarışma sürecinde özel kullanım. Lisans bilgileri yarışma sonrası eklenecek.
