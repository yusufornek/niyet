# Niyet

> **AI Destekli Mikro Emeklilik ve Birikim Alışkanlığı Platformu**
> _Harcamadığını geleceğine aktar._

---

## Canlı Demo

> ### → **<https://niyet-web.vercel.app>**
>
> **BTK Akademi Jüri Girişi**
>
> | Alan  | Değer                   |
> | ----- | ----------------------- |
> | Email | `btk@btkakademi.gov.tr` |
> | Şifre | `btk123`                |
>
> Linke tıkla → `/login` formuna yukarıdaki bilgileri gir → tüm akış demo data ile gezilebilir.

---

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

## Teknik Mimari

### Problem ve Çözüm

Niyet, 18-35 yaş aralığındaki Türk gençlerinin emekliliği uzak ve soyut bir kavram olarak görmesi sorununa cevap veren AI destekli mikro emeklilik platformudur. Kullanıcının banka ve kredi kartı hareketlerini izinli şekilde analiz eder, azaltılabilir mikro harcamaları (kahve, dijital abonelik, yemek siparişi) tespit eder ve bu tasarrufları otomatik olarak uzun vadeli emeklilik katkısına dönüştürür. Demo aşamasında gerçek banka entegrasyonu yer almıyor; bunun yerine adapter pattern ile soyutlanmış mock veri seti kullanılıyor. AI tarafı ise gerçek Gemini API ile çalışıyor.

### Genel Mimari Yaklaşım

Sistem; Clean Architecture katman disiplini, Type-Driven Design ve agentic AI pattern'larını birleştiren modern bir monorepo üzerine kuruludur. Kullanıcı arayüzünden veri tabanına kadar tüm akış type-safe olarak modellenmiştir. UI, Application, Domain ve Infrastructure katmanları arasındaki sınırlar paket bazında ayrılmıştır; her paketin tek sorumluluğu ve net public API'si vardır.

Kullanıcı, tarayıcı veya mobil tarayıcıdan Vercel üzerinde host edilen Next.js 15 uygulamasına erişir. App Router yapısı sayesinde sayfaların büyük çoğunluğu Server Component olarak çalışır; istemciye gönderilen JavaScript miktarı minimumda tutulur. Sadece etkileşim gereken yerlerde Client Component'ler devreye girer.

İstemci tarafı ihtiyaç duyduğu veriyi iki kanaldan alır. Birincisi, `/api/graphql` endpoint'ine yapılan GraphQL istekleri; ikincisi, Supabase JavaScript SDK üzerinden kurulan Realtime kanallarıdır. GraphQL tarafında Pothos code-first builder ile yazılmış type-safe bir şema, Yoga handler üzerinden serve edilir. Resolver'lar Prisma ORM aracılığıyla Supabase Postgres'e bağlanır. AI özelliklerine ihtiyaç duyan mutation'lar, AI pipeline paketini tetikler. Realtime tarafında Postgres'in `postgres_changes` event'leri kullanıcıya canlı bildirimler ve veri güncellemeleri olarak yansıtılır.

### Teknoloji Seçim Gerekçeleri

Frontend tarafında Next.js 15 App Router, React 19 ve TypeScript strict modunda kullanılıyor. Next.js 15'in Server Components mimarisi ilk yükleme süresini düşürürken SEO ve performans avantajı sağlıyor. UI katmanında Tailwind CSS utility-first yaklaşımı ile shadcn/ui erişilebilir primitive'leri birleştiriliyor; üzerine Apple Design Language'tan ilham alan tutarlı bir tasarım dili (ny-pill, ny-card, ny-tagline gibi token'lar) kurulmuş durumda.

İstemci tarafı state yönetiminde Zustand kullanılıyor; sunucudan gelen veri için TanStack Query devrede. TanStack Query, cache invalidation, optimistic update ve background refetch gibi konularda boilerplate'siz çözüm sunuyor.

Backend API olarak Next.js Route Handler'ları içinde GraphQL Yoga koşuyor. Schema, Pothos builder ile code-first yazılıyor; bu sayede TypeScript tip sistemi şemanın tek doğruluk kaynağı haline geliyor ve ileride React Native mobil uygulama eklendiğinde aynı şema yeniden kullanılabilecek.

Veri tabanı katmanında Supabase Postgres ve Prisma ORM kullanılıyor. Supabase aynı zamanda Auth (JWT bazlı), Storage ve Realtime hizmetlerini de tek noktadan sağlayarak setup karmaşıklığını minimuma indiriyor. Prisma'nın schema-first yapısı; auto-generated TypeScript tipleri, migration geçmişi ve geliştirici deneyimi avantajı için tercih edildi.

AI tarafında Google Gemini 2.5 Flash modeli, Function Calling özelliği ile birlikte kullanılıyor. Gemini Flash, maliyet ve kalite arasında optimum noktada; 300 transaction tek call ile gönderildiğinde maliyet 0.01 doların altında kalıyor. Function Calling sayesinde model serbest metin yerine yapılandırılmış komutlar üretiyor ve bu komutlar Zod ile validate edilerek veri tabanına işleniyor.

Runtime validation için Zod, hem frontend formlarda hem backend mutation input'larında hem de AI çıktılarının doğrulanmasında ortak schema kaynağı olarak kullanılıyor. Bu sayede sistem sınırlarında (kullanıcı input, harici API, AI çıktısı) tek bir doğruluk kaynağı bulunuyor.

Monorepo organizasyonu Turborepo ve Bun workspaces ile yönetiliyor. Test piramidi Vitest (unit) ve Playwright (e2e) ile kuruldu. Deploy süreci ise Vercel'in otomatik CD altyapısı üzerinden işliyor; her branch push'unda preview URL, main'e merge'de production deploy tetikleniyor.

### Paket Sorumlulukları

Repo, `apps/web` altında ana Next.js uygulamasını barındırıyor. `apps/web-legacy` eski Vite tabanlı mockup'ı sadece tasarım referansı olarak tutuyor; yeni kod yazılmıyor. `apps/mobile` ileride React Native Expo uygulaması için placeholder.

`packages/db` Postgres şemasının tek sahibidir. Prisma schema, migration dosyaları, Ayşe persona seed scripti ve Supabase RLS policy SQL'leri burada yaşar. PrismaClient instance ve auto-generated tipler bu paketten dışarıya açılır.

`packages/graphql`, GraphQL şemasını ve resolver'larını içerir. Pothos builder, Prisma plugin'i ile bağlanır; her domain için ayrı dosyada (transaction.ts, goal.ts, circle.ts gibi) tip + query + mutation tanımları bulunur. Authorization Pothos auth-scopes plugin'i ile resolver seviyesinde zorlanır. Yoga endpoint factory `apps/web/app/api/graphql/route.ts` tarafından import edilir.

`packages/ai`, Gemini entegrasyonunun tamamını barındırır. Google Gen AI SDK client'ı, function tanımları, Türkçe few-shot prompt'lar ve pipeline orkestrasyon mantığı burada. Pipeline: önce ilgili transaction'lar batch halinde toplanır, ardından sistem prompt'u, 15 kategori enum'u ve function tanımlarıyla birlikte Gemini'ye gönderilir, dönen function call'lar handler map üzerinden veri tabanına işlenir, son olarak Supabase Realtime'a "analiz tamamlandı" broadcast'i atılır.

`packages/core`, web ve gelecekteki mobil uygulamanın paylaştığı cross-cutting business logic'i içerir. 15 kategori enum'u, ikonlar, renkler, Future Score hesap fonksiyonu, tasarruf fırsatı hesap mantığı, TL ve tarih formatter'ları, paylaşımlı Zod şemaları bu paketten gelir.

`packages/config`, ESLint, TypeScript ve Tailwind preset'lerini paylaşır. Tüm uygulamalarda tutarlı dev tooling sağlar.

### Auth ve Yetkilendirme Akışı

Kullanıcı email ve şifre ile Supabase Auth'a istek gönderir. Supabase Auth, JWT bazlı bir session cookie set eder. Next.js middleware her isteği yakalar ve `supabase.auth.getUser()` çağrısı ile session'ı doğrular. Protected route'larda kullanıcı yoksa `/login`'e yönlendirme yapılır; kullanıcı varsa request context'e eklenir.

Veri tabanı tarafında tüm tablolarda Row Level Security aktif durumda ve `auth.uid() = userId` policy'leri tanımlı. Prisma ise service role key ile bağlanır, yani RLS bypass edilir; bu kasıtlı bir seçim çünkü AI analizleri gibi cross-user veri görmesi gereken işlemler resolver seviyesinde Pothos auth-scopes ile yetkilendiriliyor. İki katman birlikte hem savunma derinliği (defense in depth) hem esneklik sağlıyor.

KVKK uyumu için açık rıza akışı `/consent` rotasında yer alıyor. Kullanıcı "bağlantıyı kes" butonuna bastığında bağlı hesap ve transaction kayıtları CASCADE delete ile siliniyor; kullanıcı verisi üzerindeki egemenliği tek tıkla geri alınabiliyor.

### AI Pipeline ve Agentic Yaklaşım

Niyet'in AI tarafı sadece "prompt → metin" değil; agentic mimari pattern'larıyla yapılandırılmıştır. Dört temel pattern uygulanıyor.

İlki, Spending Analyzer Agent'tır. Single-shot batch + function calling pattern'ı ile çalışır. Kullanıcının son 90 günlük transaction'ları tek bir Gemini çağrısında 15 kategoriden birine atanır, düzenli abonelikler işaretlenir, azaltılabilir harcamalar bayraklanır ve mikro tasarruf önerileri üretilir. Yanıt yapılandırılmış function call'lar olarak döner ve Zod ile validate edildikten sonra veri tabanına işlenir.

İkincisi, AI Tasarruf Koçu pattern'ıdır. Multi-turn conversational agent loop yapısı kullanır. Kullanıcı "Bu ay nasıl gidiyorum?" gibi bir soru sorduğunda planner adımı niyeti çözer, tool selection adımı hangi function'ın çağrılacağına karar verir, executor adımı veri tabanından gerekli bilgiyi çeker, sonra cevap üretilir. Maksimum iterasyon sayısı capped'dir; sonsuz döngü riski yoktur.

Üçüncüsü, Goal Forecasting Agent'ıdır. Tool-use pattern'ı ile RapidAPI üzerinden hedef ürünün güncel fiyatını çeker, TÜFE enflasyon verisi ile birleştirir ve hedefin ne zaman ulaşılabileceğini hesaplar. Burada AI yalnızca koordinatör rolünde; sayısal hesap deterministik kalır.

Dördüncüsü, Future Score Updater'dır. 0 ile 100 arasında bir finansal disiplin puanı hesaplar. Formül tamamen deterministiktir; AI bu skorun anlatımı (narration) için kullanılır, hesabın kendisinde değil.

Tüm agent'lar bounded autonomy prensibine tabidir. Kullanıcı açık onayı olmadan para hareketi yapılmaz. Her AI çağrısı yapılandırılmış log üretir; model adı, token sayısı, maliyet tahmini, çağrı süresi kayıt altına alınır. Function call schema mismatch durumunda Zod parse hatası log'lanır ve o call atlanır; tüm batch fail olursa kullanıcıya açık bir hata mesajı gösterilir. Maliyet ve token bütçesi cap'lidir; kullanıcı başına saatlik analiz sayısı sınırlanır.

### Realtime Stratejisi

Supabase Realtime üzerinden üç kanal yapısı kullanılıyor. Notification kanalı, yeni bildirim insert'lerini dinler; transaction kanalı, batch transaction yüklemelerini izler; analysis kanalı ise AI analiz pipeline'ının başlangıç ve bitiş event'lerini taşır. Frontend Supabase JS client'ı `channel.on('postgres_changes', ...)` ile bu event'lere subscribe olur; gelen payload Sonner toast'larıyla kullanıcıya gösterilir ve ilgili TanStack Query cache'leri invalidate edilir, böylece UI otomatik tazelenir.

### Performans Hedefleri

İlk anlamlı render (First Contentful Paint) 1.5 saniyenin altında tutuluyor. Bunu sağlamak için Server Components, dinamik import ve edge caching birlikte kullanılıyor. GraphQL `dashboard` query'sinin P95 latency hedefi 200 milisaniyenin altında; bu, doğru index'lenmiş kolonlar ve seçici Prisma include'larıyla destekleniyor. `runAnalysis` mutation'ı için P95 hedef 5 saniye; Gemini Flash model seçimi, batch'leme ve 1 saatlik analiz cache'i bu hedefi destekliyor. Realtime event latency'si 1 saniyenin altında, Supabase'in global edge altyapısı sayesinde. Bundle boyutu (web main chunk) gzipped 250 KB altında; shadcn primitive'lerinin selective import'u ve route bazlı code splitting bu hedefi koruyor.

### Deployment ve CI/CD

Geliştirici main branch'e push yaptığında GitHub üzerinde Vercel build pipeline tetiklenir. Turborepo cache hit'leriyle build hızlandırılır; ardından lint, type-check ve Vitest unit test'leri sırayla geçilir. Yeşilse Vercel build'i devam eder, edge deploy yapılır, kayıtlı cron job'lar register edilir. Her branch için preview URL, main için production URL üretilir. Veri tabanı migration'ları kasıtlı olarak CI'da çalıştırılmıyor; production migration'ı sahip kullanıcı tarafından manuel olarak `bun db:migrate:prod` komutu ile uygulanıyor. Bu, yanlışlıkla schema kırılması riskini önlüyor.

Environment variable'lar Vercel dashboard'tan yönetilir. Database URL, Supabase URL ve key'leri, Gemini API key'i, RapidAPI key'i gibi secret'lar hem production hem preview environment'larına set edilir. Public olması gereken değişkenler `NEXT_PUBLIC_` prefix'i taşır ve sadece bu prefix'li değişkenler client bundle'a dahil edilir; geri kalan secret'lar yalnızca server-side çalışan kodda görünür.

### Observability ve Hata Yönetimi

Tüm sunucu tarafı isteklerde request ID, userId ve duration alanlarıyla yapılandırılmış log üretilir. AI çağrıları için ayrı bir log kanalı vardır; model, token count, maliyet tahmini, function call sayısı ve süre kayıt altına alınır. Frontend tarafında React error boundary kritik render hatalarını yakalar; kullanıcıya Sonner toast ile bildirim gösterilir. Vercel Analytics gerçek kullanıcı performans verisini (RUM) toplar.

### Güvenlik Önlemleri

Tüm tablolarda RLS aktif ve `auth.uid() = userId` koşulu uygulanır. Service role key sadece server-side Prisma bağlantısında kullanılır; client'a hiçbir şekilde sızmaz. GraphQL mutation'larında Pothos auth-scopes plugin'i, kullanıcının yalnızca kendi kaynaklarına müdahale edebilmesini garanti eder. Tüm input'lar Zod ile parse edilir; çözümlenemeyen veri reject edilir. AI çıktıları da Zod ile doğrulanır; modelin halüsinasyon ürettiği durumlar (geçersiz kategori, var olmayan transaction ID) DB'ye yazılmadan elenir.

### Sonuç

Niyet'in mimarisi; tip güvenliği, agentic AI pattern'ları ve mikro paket disiplini üzerine kuruludur. Demo aşamasında gerçek banka entegrasyonu mock olsa da AI pipeline, auth, realtime ve veri akışları production-grade kalite ile inşa edilmiştir. Mimarinin ileride gerçek banka API entegrasyonuna geçişi tek bir adapter eklenmesi seviyesindedir; bu da Clean Architecture'ın ödülünü kanıtlayan somut çıktıdır.

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
