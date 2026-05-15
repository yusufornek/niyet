# MEMORY.md — Architecture Decision Records

> Projedeki **mühendislik kararlarının log'u**. Her ADR (Architecture Decision Record) bir kararın **tarihi**, **bağlamı**, **alternatifleri**, **gerekçesini** ve **revisit tarihini** içerir. Karar değişirse yeni ADR yazılır, eskisi `superseded` işaretlenir.

---

## ADR Şablonu

```
## ADR-NNN: Karar başlığı
**Tarih**: YYYY-MM-DD
**Durum**: Accepted | Superseded by ADR-XYZ | Deprecated
**Karar verenler**: <isimler>
**Revisit**: YYYY-MM-DD (veya "gerekirse")

### Bağlam
Neden bu karara ihtiyaç duyuldu?

### Alternatifler
A, B, C — neden seçilmedi?

### Karar
Seçilen seçenek.

### Sonuçları
Pozitif ve negatif etkileri.
```

---

## ADR-001: Next.js + Supabase + Prisma + GraphQL stack seçimi

**Tarih**: 2026-05-11
**Durum**: Accepted
**Karar verenler**: Yusuf
**Revisit**: Demo sonrası (yaklaşık 2026-07)

### Bağlam

Yarışma jürisine **web link** ile gönderilecek bir mikro emeklilik platformu inşa edilecek. Yasal hazırlık nedeniyle gerçek banka entegrasyonu yok; mock data + Gemini AI ile uçtan uca akış simüle edilecek. 2-3 kişilik full-stack ekip, 2+ ay süre. Eldeki Vite + React + shadcn/ui mockup'ı 20 ekran ile tamamlanmış (Lovable.dev ile üretilmiş).

### Alternatifler

| Stack                                               | Avantaj                                                                                        | Dezavantaj                                    |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **Next.js + Supabase + Prisma + GraphQL** (seçildi) | SSR/RSC, auth+DB+realtime tek yerde, code-first type-safe API, mobile için RN/Apollo hazırlığı | GraphQL overhead 2-3 kişi için fazla olabilir |
| Vite SPA + Express/Fastify + Postgres               | Daha basit, mockup'ı korur                                                                     | Auth/realtime ayrı setup, SSR yok             |
| Next.js + Vercel KV + Server Actions                | En modern, en hafif                                                                            | Vendor lock-in, mobile çıkarımı zor           |
| RN Expo + tRPC                                      | Mobile-first                                                                                   | Jüri demosu için TestFlight/APK zahmeti       |

### Karar

**Next.js 15 (App Router) + Supabase (DB+Auth+Realtime) + Prisma + GraphQL (Pothos+Yoga)** stack'ini seçtim. Mevcut Vite mockup tasarım referansı olarak `apps/web-legacy/`'de korunacak; yeni kod Next.js'te yazılacak. Monorepo (Turborepo + Bun workspaces) ileride RN Expo eklemek için hazır olur.

### Sonuçları

**Pozitif**:

- Jüri için tek tık deploy (Vercel)
- Type-safe API (Pothos + Prisma)
- DB seviyesinde authorization (Supabase RLS)
- Mobile için hazır altyapı

**Negatif**:

- GraphQL plumbing 2-3 kişi için biraz fazla; gerekçe RN için.
- Supabase + Prisma "connection_limit=1 + pgbouncer" trick'i öğrenme eğrisi var.
- Monorepo setup zamanı (~1 gün) demo süresinden çıkar.

---

## ADR-002: Mevcut Vite mockup'ını Next.js'e port et, sıfırdan yazma

**Tarih**: 2026-05-11
**Durum**: Accepted
**Karar verenler**: Yusuf
**Revisit**: Faz 2 sonrası

### Bağlam

Vite + React + shadcn/ui ile 20 ekranlık tıklanabilir mockup mevcut. ADR-001 ile Next.js seçildi. İki seçenek: (a) Vite'ı koru, ayrı backend ekle (b) Next.js'e port et.

### Alternatifler

- **Vite'ı koru** + ayrı backend: Frontend yatırımı korunur ama 2 deployment, 2 CORS, SSR yok, auth integration zor
- **Next.js'e port** (seçildi): 2-3 günlük migration cost ama uzun vadeli temizlik, SSR/auth temiz
- **Mockup'ı tamamen at**, sıfırdan Next.js: tasarım yatırımı çöp olur

### Karar

Vite mockup'ı `apps/web-legacy/` altında referans olarak tut. Next.js `apps/web/` altında sıfırdan kur ama:

- CSS token'lar (`index.css`) 1:1 kopyala
- shadcn/ui primitives (`components/ui/*`) 1:1 kopyala
- Custom components (PhoneShell, ScoreCard) 1:1 kopyala
- Screen layout'ları içerikleriyle birlikte taşı (her ekran ayrı `page.tsx`)
- Zustand mock data'ları Prisma seed'e taşı
- react-router-dom kaldır, App Router file-based routing kullan

### Sonuçları

**Pozitif**: Tasarım yatırımı korunur, mimari temiz başlar.
**Negatif**: Port migrationu Faz 2'de ~6 saat.

---

## ADR-003: Gemini 2.5 Flash + Function Calling

**Tarih**: 2026-05-11
**Durum**: Accepted
**Karar verenler**: Yusuf
**Revisit**: Faz 5 testten sonra

### Bağlam

AI ile transaction'ları kategorize etmek, abonelik tespit etmek, azaltılabilir harcamaları flagle ihtiyacı var. Gemini, OpenAI, Anthropic seçenekleri var.

### Alternatifler

- Gemini 2.5 Flash + JSON output (free-form): Token ucuz ama parsing manuel
- **Gemini 2.5 Flash + Function Calling** (seçildi): Structured, retry-friendly, action-oriented
- Gemini 1.5 Pro: Daha kaliteli ama 5x pahalı
- GPT-4o: Kaliteli ama daha pahalı, ToS açısından mahsurlu
- Claude 3.5 Sonnet: Yetenekli ama Türkçe nüans bazen Gemini'den zayıf

### Karar

Gemini 2.5 Flash + Function Calling. Function definitions: `set_transaction_category`, `mark_as_subscription`, `flag_reducible`, `recommend_micro_saving`. Her function call backend executor tarafından DB'ye yansıtılır.

### Sonuçları

**Pozitif**: Maliyet düşük (~$0.01/run), structured output, retry kolay, batch tek call.
**Negatif**: Function calling Gemini implementasyonu OpenAI'dan farklı; öğrenme eğrisi.

---

## ADR-004: Trunk-based development + Conventional Commits

**Tarih**: 2026-05-11
**Durum**: Superseded by ADR-009 (2026-05-11)
**Karar verenler**: Yusuf
**Revisit**: —

### Bağlam

2-3 kişilik full-stack ekip, hızlı iterasyon gerekiyor. PR + review overhead'i sınırlamak istiyoruz ama main'in stabil kalması da kritik.

### Karar

- **Trunk-based**: main'e direkt push. Büyük değişiklikler için opsiyonel feature branch + PR (squash-merge).
- **Pre-push hook (Husky)**: lint + type-check + quick test zorunlu (broken main'i baştan engelle).
- **Conventional Commits + commitlint**: feat/fix/docs/refactor/test/chore/perf/style/build/ci/revert tipleri.
- **CI**: her push'ta GitHub Actions (lint + type-check + vitest) çalışır.

### Sonuçları

**Pozitif**: Hızlı iterasyon, review overhead minimum.
**Negatif**: Disiplin gerektirir. Yeni ekip üyesi `--no-verify` çalıştırırsa kuralları by-pass eder.

---

## ADR-005: Bun package manager + Turborepo

**Tarih**: 2026-05-11
**Durum**: Accepted
**Karar verenler**: Yusuf
**Revisit**: Vercel Bun runtime stabilleşince (?)

### Bağlam

Mockup'ta zaten Bun kullanılmış (`bun.lockb`). Monorepo gerekiyor (web + db + graphql + ai + core paketleri). Vercel'in Next.js'i Node.js runtime'da çalıştırması bilinen kısıt.

### Karar

- **Bun** dev/install/test için (hız avantajı)
- **Vercel'de prod Node.js runtime** (Next.js bunu otomatik yapar)
- **Turborepo** pipeline caching ve cross-package orchestration için
- **Bun workspaces** (pnpm/npm yerine)

### Sonuçları

**Pozitif**: `bun install` çok hızlı, native test runner, modern DX.
**Negatif**: Bazı Node-only paketler Bun'da sorun çıkarabilir (örn. Prisma binary'leri); workaround'lar bilinir.

---

## ADR-006: Demo persona "Ayşe" — öğrenci 22 yaş 8K ₺/ay

**Tarih**: 2026-05-11
**Durum**: Accepted
**Karar verenler**: Yusuf
**Revisit**: İkinci persona eklenirse

### Bağlam

Jüri demosu için tek bir demo user'ı seed'leyeceğiz. Persona seçimi storytelling'i etkiler.

### Alternatifler

- Genç profesyonel (28, 35K ₺): orta-üst gelir, dengeli
- Freelancer (26, düzensiz): "Pause Contribution" feature için iyi
- Aileli çalışan (32, ev+çocuk): "Aile Çemberi" için iyi
- **Öğrenci (22, 8K ₺)** (seçildi): mikro birikim hikayesi en güçlü, hedef kitle ile duygusal bağ

### Karar

"Ayşe" — 22 yaş, İstanbul, üniversite son sınıf, 8K ₺/ay (burs+part-time). Tipik harcama:

- Kahve haftalık 4x, yemek siparişi 3x, market 1x
- Abonelikler: Netflix, Spotify, Disney+, ChatGPT Plus (1.172 ₺/ay)
- Online alışveriş ayda 2x Trendyol
- Tasarruf fırsatı 90 günde ~6.000 ₺

### Sonuçları

**Pozitif**: Jüri için duygusal bağ; küçük tutarlardan büyük etkiye ulaşma hikayesi güçlü.
**Negatif**: Tek persona, B2B kitlesini (orta yaş) tam yansıtmaz. Faz 7'de ek persona eklenebilir.

---

## ADR-007: 15 sabit Türkçe kategori enum

**Tarih**: 2026-05-11
**Durum**: Accepted
**Karar verenler**: Yusuf
**Revisit**: Kullanıcı feedback'i sonrası

### Bağlam

Harcama kategorilerinin nasıl yönetileceğine karar verme. Performance, UI consistency, Gemini token kullanımı önemli.

### Alternatifler

- 12 sade kategori
- **15 zengin kategori** (seçildi)
- 8 minimal kategori
- Hierarchical (Yiyecek > Restoran > Fast Food)
- Free-form + normalize

### Karar

15 sabit Türkçe enum (Prisma `SpendingCategory`):
MARKET, FOOD_DELIVERY, COFFEE, DINING_OUT, TRANSPORT, FUEL, BILLS, SUBSCRIPTIONS, ONLINE_SHOPPING, CLOTHING, HEALTH, ENTERTAINMENT, EDUCATION, SPORTS, OTHER

### Sonuçları

**Pozitif**: Gemini token-efficient, DB indexed enum, UI tutarlı ikon/renk eşlemesi.
**Negatif**: Edge case'ler "OTHER"a düşer; gerçek banka entegrasyonunda zenginleştirilebilir.

---

## ADR-008: Doküman seti seçimi

**Tarih**: 2026-05-11
**Durum**: Accepted
**Karar verenler**: Yusuf

### Bağlam

Yusuf "CLAUDE.md, HANDOFF.md, MEMORY.md vs yazıp pushlayacağız" dedi. Hangi doc'lar gerek?

### Karar

Repo root'unda 8 doküman:

1. **README.md** — public intro + setup
2. **CLAUDE.md** — AI asistan rehberi
3. **HANDOFF.md** — yeni ekip üyesi onboarding
4. **ARCHITECTURE.md** — sistem mimarisi diyagramı
5. **MEMORY.md** — ADR log'u (bu dosya)
6. **CONTRIBUTING.md** — commit/PR/branching kuralları
7. **SECURITY.md** — KVKK + secrets + RLS notları
8. **.env.example** — env vars şablonu

### Sonuçları

**Pozitif**: Yeni ekip üyesi 1 saatte oryantasyon olabilir.
**Negatif**: 8 dosyayı güncel tutmak disiplin gerektirir. Solution: her PR'da "doc güncellendi mi?" check'i.

---

## ADR-009: Feature-branch + Manual Merge (ADR-004'ün yerine)

**Tarih**: 2026-05-11
**Durum**: Accepted
**Karar verenler**: Yusuf
**Revisit**: Ekibin akışı oturduğunda

### Bağlam

ADR-004 trunk-based development önermişti (main'e doğrudan push). Faz 0 sonrası geliştirme sürecini düşünürken proje sahibi (Yusuf) main'e ne girdiğini **manuel onay** ile kontrol etmek istediğini belirtti. Demo süresi 2+ ay; jüriye gidecek bir ürün; main'in her zaman "demo edilebilir" kalması kritik.

### Alternatifler

- **Trunk-based**: hızlı, ama main'i kırma riski yüksek
- **Feature branch + manual merge** (seçildi): her değişiklik branch'te birikir, sahibi onayıyla main'e geçer
- **Feature branch + auto-merge after CI green**: CI yeşilse otomatik merge — ama sahibi gözden geçirmek istiyor

### Karar

- **Default: feature branch + manual merge**
- Her özellik/faz **kendi branch'inde** geliştirilir (`feat/`, `fix/`, `chore/`, `docs/` prefix'leri)
- Branch hazır olduğunda push edilir; proje sahibi **explicit "merge" onayı** vermeden main'e geçmez
- Merge yöntemi: **squash-merge** (linear history)
- CI her push'ta çalışır (PR olsun olmasın); merge öncesi yeşil olmak zorunda
- Pre-push hook trunk-based için kritikti; feature branch'te de korunur ama "broken main" riski büyük ölçüde azalmıştır
- Branch isimlendirme:
  - `feat/<topic>` — yeni özellik (örn: `feat/web-foundation`, `feat/gemini-pipeline`)
  - `fix/<topic>` — bug fix
  - `chore/<topic>` — config/process (örn: `chore/branching-workflow`)
  - `docs/<topic>` — sadece doküman
  - `refactor/<topic>` — yeniden organizasyon

### Sonuçları

**Pozitif**:

- Main her zaman demo-edilebilir; jüriye link verince crash riski minimum
- Sahibi context oluyor: her merge öncesi diff'i görüyor, soru sorabiliyor
- Yarım kalmış işler main'i kirletmez

**Negatif**:

- Manuel onay süreci hızı yavaşlatır (özellikle solo veya 2 kişi için)
- Merge bekleyen branch'ler birikebilir (çözüm: küçük branch'ler, sık merge)
- "Tek kişi gate" — sahibi yoksa merge olmaz (Faz 8'de back-up reviewer atanabilir)

---

## ADR-010: Hedef planı deterministik, açıklaması AI destekli; fiyat takibi akıllı cron ile

**Tarih**: 2026-05-15
**Durum**: Accepted
**Karar verenler**: Yusuf, Codex
**Revisit**: Gerçek ürün fiyat servisi maliyeti ölçülünce

### Bağlam

Hedef oluşturma akışı statik aylık katkı hesaplıyordu (`target / 120`). Product backlog, hedefe göre kişiselleştirilmiş tasarruf planı, güncel fiyat takibi ve önemli fiyat değişiminde bildirim istiyor. Fiyat servisi external API kullandığı için sistemi ve quota'yı yormamak gerekiyor.

### Alternatifler

- Tam AI plan: esnek ama hesap doğruluğu ve test edilebilirlik zayıf.
- Sadece deterministik plan: stabil ama kullanıcıya özel açıklama dili zayıf.
- Deterministik plan + AI açıklama (seçildi): hesaplar test edilebilir, Gemini sadece metni kişiselleştirir.
- Her hedefi günlük yenile: basit ama API maliyeti yüksek.
- Akıllı aralık (seçildi): yakın hedef günlük, orta vade 3 günde bir, uzak hedef haftalık.

### Karar

- Plan hesabı `@niyet/core` içinde pure function olarak yapılır.
- Gemini hedef planı hesaplamaz; sadece verilen planı Türkçe kısa açıklamaya dönüştürür.
- Fiyat takibi `nextPriceCheckAt` ile hedef bazlı schedule edilir.
- Refresh başarısızlıkları 1/3/7 gün backoff ile ötelenir.
- Önemli fiyat değişimi hem `GoalPriceAlert` hem `Notification(type=GOAL_PRICE_ALERT)` üretir.
- Vercel cron günde bir çalışır, batch ve concurrency env ile sınırlanır.

### Sonuçları

**Pozitif**: Hesaplar deterministik ve test edilebilir; AI metin kalitesi katar; API kullanımı kontrollü kalır; mevcut realtime notification akışı yeniden kullanılır.
**Negatif**: Gerçek fiyat servisinin sonucu değişken olabilir; real provider smoke test CI'a zorunlu bağlanmaz, staging/manual kontrol olarak kalır.

## ADR-011: Hedef enflasyon varsayımı TÜİK TÜFE bülteninden beslenir

**Tarih**: 2026-05-15
**Durum**: Accepted
**Karar verenler**: Yusuf, Codex
**Revisit**: TÜİK Veri Portalı endpoint formatı değişirse

### Bağlam

Hedef detayında "Beklenen yıllık enflasyon" alanı kullanıcı veya mock veriyle kalabiliyordu; örnek hedefte `%9` görünmesi hedef planı için güvenilir değildi. Kullanıcı, bu oranın TÜİK'ten alınmasını istedi.

### Karar

- `latestInflationRate` GraphQL query'si TÜİK resmi `data.tuik.gov.tr/api/tr/press` listesinden `Tüketici Fiyat Endeksi` bültenini bulur.
- Bülten detayı `api/tr/press/{id}` üzerinden alınır; yıllık ve aylık TÜFE oranı içerikten parse edilir.
- Sonuç 12 saat server-side cache'lenir; hata halinde UI kayıtlı hedef oranına fallback yapar.
- Yeni hedef oluştururken frontend TÜİK yıllık oranını gönderir; backend input gelmezse TÜİK cache'inden okuyup son çare `32` fallback kullanır.

### Sonuçları

**Pozitif**: Hedef ekranındaki enflasyon varsayımı güncel resmi bültene bağlandı; her render'da TÜİK'e istek atılmadığı için sistem yorulmaz.
**Negatif**: TÜİK frontend API veya bülten metni formatı değişirse parser güncellenmelidir.

<!-- Yeni ADR'lar buraya eklenir -->
