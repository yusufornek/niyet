# HANDOFF.md — Yeni Ekip Üyesi Onboarding

> Bu dokümanı oku, **1 saat içinde projeyi setup edip ilk PR'ını açabilir hale gelirsin**. Detay için diğer doc'lara link verilmiştir.

---

## 1. Niyet Nedir? (60 saniyede)

Niyet, kullanıcının banka/kart hareketlerini AI ile analiz edip **azaltılabilir mikro harcamaları** tespit eden ve bu tasarrufu **uzun vadeli emeklilik katkısına** dönüştüren mobil-öncelikli bir fintech platformu. Şu anda **yarışma demo aşamasında**: yasal hazırlıklar nedeniyle gerçek banka entegrasyonu yok, **mock data + gerçek Gemini AI** ile uçtan uca akış çalışıyor. Hedefimiz jüriye gönderilecek bir **web link demosu**.

Detay: `docs/project-brief/Niyet_Mikro_Emeklilik_Proje_Raporu.pdf`

---

## 2. Mimari Karar Gerekçeleri (Neden bu stack?)

| Karar                                   | Gerekçe                                                                               | Alternatif neden seçilmedi?                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Next.js 15 (App Router)**             | Jüri demosu web link ile; SSR/RSC; auth entegrasyonu temiz; Vercel ile tek-tık deploy | RN Expo: mobil demo zor (TestFlight/APK); Vite SPA: backend ayrı setup     |
| **Supabase**                            | DB + Auth + Realtime + Storage tek yerde; RLS güvenlik; free tier yeterli             | Firebase: NoSQL Niyet'in relational veri modeline uymuyor; Neon: Auth ayrı |
| **Prisma**                              | Schema-first, otomatik tip üretimi, migration sistemi; ekip yeniyse öğrenmesi kolay   | Drizzle: daha yeni, migration daha manuel                                  |
| **GraphQL (Pothos + Yoga)**             | Code-first %100 type-safe; ileride RN için aynı schema (Apollo Client)                | REST: mobile için daha az verimli; tRPC: RN entegrasyonu zayıf             |
| **Gemini 2.5 Flash + Function Calling** | Cost/quality optimum; structured action output (set_category, mark_subscription, ...) | GPT-4: pahalı; Claude: function calling daha karmaşık                      |
| **Turborepo + Bun workspaces**          | Pipeline caching; Vercel native; Bun hız                                              | pnpm: yavaş; Nx: 2-3 kişiye ağır                                           |
| **Feature-branch + Manuel merge**       | Demo'da main her zaman stabil; proje sahibi her merge'ü onaylar                       | Trunk-based: hızlı ama main kırılma riski                                  |
| **shadcn/ui + Tailwind**                | Mockup'ta zaten kurulu; component'lerin sahibi sen olursun                            | MUI/Chakra: bundle ağır                                                    |

Karar log'u: `MEMORY.md`

---

## 3. Setup (15 dk)

### Önkoşullar

- Bun ≥ 1.1 (`curl -fsSL https://bun.sh/install | bash`)
- Node.js ≥ 20
- Git
- VS Code / Cursor (önerilir; `.vscode/extensions.json` öneriler)

### Adımlar

```bash
# 1. Repo
git clone https://github.com/yusufornek/niyet.git
cd niyet

# 2. Dependencies
bun install

# 3. Env vars
cp .env.example .env.local
# .env.local doldur — Supabase + Gemini bilgileri için projeden Yusuf'a ulaş

# 4. DB setup
bun db:generate      # Prisma client
bun db:migrate       # Supabase'e schema push
bun db:seed          # Ayşe persona + 90 gün tx

# 5. Çalıştır
bun dev
```

http://localhost:3000 açılır.

### Supabase Access

- Proje URL'i: <Yusuf'tan al>
- Dashboard erişimi: <Yusuf seni ekler>
- Service role key: `.env.local`'a yapıştır

### Gemini API Key

- <https://aistudio.google.com/app/apikey>'den kendi key'ini al (dev için)
- Prod key Vercel env'de tutulur

### Goal Tracking Env

- `RAPIDAPI_KEY`: ürün arama ve fiyat yenileme için kullanılır.
- `CRON_SECRET`: `/api/cron/refresh-goal-prices` endpoint'ini korur; Vercel env'de tanımlı olmalı.
- `PRICE_REFRESH_BATCH_LIMIT`: tek cron run'ında kontrol edilecek hedef sayısı (varsayılan 20).
- `PRICE_REFRESH_CONCURRENCY`: aynı anda kaç fiyat sorgusu yapılacağı (varsayılan 2).

---

## 4. İlk Hafta Yol Haritası

### Gün 1: Oryantasyon

- [ ] Bu HANDOFF'u oku
- [ ] `ENGINEERING.md` mühendislik manifestosunu oku (en önemlisi)
- [ ] `ARCHITECTURE.md` ile genel sistemi anla
- [ ] `CLAUDE.md` ile kod konvansiyonlarına bak
- [ ] Local setup'ı tamamla, demoyu kendi browser'ında çalıştır
- [ ] `apps/web-legacy/` mockup'ı keşfet (referans için)
- [ ] Prisma Studio'da DB'yi gez (`bun db:studio`)

### Gün 2-3: Küçük PR

- [ ] `MEMORY.md`'ye kendin için bir not düş (ne öğrendin, neyi anlamadın)
- [ ] Trivial bir fix veya doc update'i PR olarak aç
- [ ] CI pipeline'ının çalıştığını gör

### Gün 4-5: Modül sahipliği

Aşağıdaki modüllerden birinde "first owner" ol (proje sahibiyle konuş):

- Spending Analysis & Saving Radar (paketler: `db`, `graphql`, `ai`, `web`)
- Goal Tracking & Forecasting (paketler: `db`, `graphql`, `web`)
- Future Score & Engagement (paketler: `core`, `web`)
- Social Saving & Circles (paketler: `db`, `graphql`, `web`)
- AI Saving Coach / Chatbot (paketler: `ai`, `web`)

---

## 5. Domain Sözlüğü

- **Niyet**: ürünün adı; "intention" anlamında
- **Mikro Emeklilik Katkısı**: kullanıcının azaltılabilir harcamasından emeklilik fonuna aktardığı küçük tutarlar
- **Harcama Radarı (Spending Radar)**: AI'ın azaltılabilir harcamaları tespit ettiği modül
- **Gelecek Skoru (Future Score)**: Düzenli katkı, hedef bağlılığı, harcama disiplini, sosyal katılım'ı puanlayan 0-100 skor
- **Birikim Çemberi (Saving Circle)**: aile veya topluluk ortak birikim hedefi
- **Hedef Tasarruf Planı**: hedef fiyatı, hedef tarihi, gelir, son 30 gün tasarruf fırsatı ve kabul edilen katkılara göre hesaplanan aylık katkı planı. Hesap deterministik yapılır; Gemini sadece kısa açıklama metnini kişiselleştirir.
- **Fiyat Alarmı**: takipli hedefin fiyatı %5 veya daha fazla değişince oluşan `GoalPriceAlert` + `GOAL_PRICE_ALERT` bildirimi.
- **Akıllı Fon Koçu (Smart Fund Coach)**: risk profili + hedef süresine göre fon karşılaştırma; **yatırım tavsiyesi VERMEZ**
- **AI Saving Coach**: chatbot tarzı kişiselleştirilmiş tasarruf önerileri
- **Otomatik Bağış (Auto Donation)**: ekstra tasarrufun bir kısmını sosyal fayda projelerine yönlendirme
- **Açık Bankacılık (Open Banking)**: kullanıcı izniyle banka verisi erişimi (Niyet'te şimdilik **mock**)
- **Persona "Ayşe"**: demo kullanıcı — 22 yaş, öğrenci, 8K ₺/ay, İstanbul

---

## 6. Sık Karşılaşılan Sorunlar

### `bun install` "EACCES" hatası verirse

Bun'u global mi local mi yüklediğine bağlı. Çözüm: `npm uninstall -g bun && curl -fsSL https://bun.sh/install | bash`

### Prisma `DATABASE_URL` connect edemiyor

Supabase pooler URL'i 6543 portunda, migrate için direkt 5432 portu gerekir. `.env.local` içinde hem `DATABASE_URL` hem `DIRECT_URL` olmalı (örn için `.env.example`).

### Next.js dev server "Module not found: @niyet/core"

Workspace package'ları henüz build edilmemiş. Çözüm: `bun --filter @niyet/core build && bun dev`

### Gemini quota dolarsa

Google AI Studio'da rate limit görülür. Kendi key'inle dev yap; prod key dokunma.

### Fiyat takibi çalışmıyorsa

Önce `RAPIDAPI_KEY` ve `CRON_SECRET` env'lerini kontrol et. Manuel test için takipli bir hedef detayında "Fiyatı yenile" butonunu kullan. Otomatik kontrol Vercel cron ile `/api/cron/refresh-goal-prices` endpoint'ini çağırır; local'de aynı endpoint'e `Authorization: Bearer <CRON_SECRET>` header'ı ile istek atılabilir.

### TÜİK enflasyon oranı güncellenmiyorsa

Hedef detayındaki yıllık enflasyon kartı `latestInflationRate` GraphQL query'sinden beslenir. Backend, TÜİK resmi `https://data.tuik.gov.tr/api/tr/press` listesinden `Tüketici Fiyat Endeksi` bültenini bulur, detay endpoint'indeki yıllık/aylık TÜFE oranını parse eder ve sonucu 12 saat cache'ler. Dış kaynak geçici hata verirse query `null` döner ve UI hedefte kayıtlı enflasyon oranına düşer.

### Öğren modülü günlük içerik cron'u

`/learn` artık statik değil; içerik `learnHome` GraphQL query'sinden gelir. Günlük paket üretimi için `GET /api/cron/refresh-learn-content` endpoint'i eklendi (`Authorization: Bearer <CRON_SECRET>`). Pipeline resmi kaynakları (EGM + TÜİK) çekip doğrular, hash aynıysa tekrar yayın yapmaz, yeni paket yayınlanınca `LEARN_UPDATE` bildirimi üretir.

---

## 7. İletişim & Sorumluluklar

- **Proje sahibi**: Yusuf (@yusufornek) — mimari kararlar, infra, demo prezentasyonu
- **Frontend ownership**: <ekibe göre>
- **Backend/AI ownership**: <ekibe göre>
- **Slack/Discord**: <link>

---

## 8. Yararlı Linkler

- [Next.js App Router docs](https://nextjs.org/docs/app)
- [Supabase Auth helpers (Next.js)](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Prisma + Supabase guide](https://www.prisma.io/docs/orm/overview/databases/supabase)
- [Pothos GraphQL](https://pothos-graphql.dev/)
- [GraphQL Yoga](https://the-guild.dev/graphql/yoga-server)
- [Gemini API docs](https://ai.google.dev/api/docs)
- [shadcn/ui](https://ui.shadcn.com/)
- [Turborepo handbook](https://turbo.build/repo/docs)

---

**Hoş geldin! Soruların varsa proje sahibine ulaş veya `MEMORY.md`'ye not düş.**
