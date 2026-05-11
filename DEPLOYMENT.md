# DEPLOYMENT.md — Niyet Deployment Rehberi

Niyet'in **Vercel** üzerinde sürekli erişilebilir bir URL'de yayınlanması için adım-adım kurulum.

---

## Önkoşullar

- GitHub repo erişimi (`yusufornek/niyet`)
- Vercel hesabı (<https://vercel.com/signup> — GitHub ile bağla)
- Supabase env'lerinin hazır olduğundan emin ol (bkz. `.env.example`)
- Gemini API key (gerçek AI analizi için; yoksa stub mode devreye girer)

---

## 1. Vercel Project Import

### Tek seferlik kurulum

1. <https://vercel.com/new> aç.
2. **Import Git Repository** sekmesinden `yusufornek/niyet` seç.
3. **Framework Preset**: Next.js (otomatik algılanır).
4. **Root Directory**: `apps/web` _(monorepo build için kritik)_.
5. Vercel `vercel.json`'u algılayıp build komutunu otomatik ayarlar:
   ```
   buildCommand: cd ../.. && bun --filter @niyet/db generate && bun --filter @niyet/web build
   installCommand: cd ../.. && bun install
   outputDirectory: apps/web/.next
   ```

### Environment Variables (Settings → Environment Variables)

`Production` + `Preview` + `Development` her üçü için tanımla:

| Key                             | Değer                                                                                                                   | Notlar                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `DATABASE_URL`                  | `postgresql://postgres.PROJECT:PWD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` | **Transaction pooler** (port 6543) — serverless için       |
| `DIRECT_URL`                    | `postgresql://postgres.PROJECT:PWD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`                                   | **Session pooler** (port 5432) — migrate için (build-time) |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://PROJECT.supabase.co`                                                                                           | Public, client-side                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` (anon JWT)                                                                                              | Public, RLS koruması altında                               |
| `SUPABASE_SERVICE_ROLE_KEY`     | `eyJhbGciOi...` (service_role JWT)                                                                                      | **Yalnızca server**, `NEXT_PUBLIC_*` prefix yok            |
| `GEMINI_API_KEY`                | `AIzaSy...`                                                                                                             | <https://aistudio.google.com/app/apikey>'den al            |
| `GEMINI_MODEL`                  | `gemini-2.5-flash`                                                                                                      | (opsiyonel, default)                                       |
| `NEXT_PUBLIC_APP_URL`           | `https://niyet.vercel.app`                                                                                              | Production domain                                          |
| `NEXT_PUBLIC_APP_ENV`           | `production`                                                                                                            | (preview/development için ayarla)                          |

> **Güvenlik notu**: `SUPABASE_SERVICE_ROLE_KEY` ve `GEMINI_API_KEY` asla `NEXT_PUBLIC_*` prefix'i ile başlamaz — yalnızca server-side erişilebilir. Vercel bu sözleşmeyi otomatik uygular.

### Deploy

İlk push veya manuel "Deploy" butonu → ~2-3 dakikada build tamamlanır.

URL: `https://niyet.vercel.app` (veya custom domain bağlanırsa farklı).

---

## 2. Sonraki Push'lar — Otomatik Deploy

ADR-009 sözleşmesi gereği:

- **`main` branch'e push** → Production deploy (`niyet.vercel.app`)
- **Feature branch push** → Preview deploy (`niyet-git-feat-xxx.vercel.app`)

Her PR/push için Vercel otomatik build + URL üretir. Production'a ne girdiğini görmek için commit history yeterli.

---

## 3. Domain Bağlama (opsiyonel)

Custom domain için:

1. Settings → Domains → Add domain
2. DNS sağlayıcında `CNAME` record: `niyet.app → cname.vercel-dns.com`
3. Vercel otomatik HTTPS sertifikası verir

---

## 4. Database Migration (Production'a İlk Deploy)

İlk deploy öncesi production DB'de schema kurulu olmalı. **Manuel** yap (CI'da değil, yanlışlık önleme):

```bash
# Local'de production env yükle (Vercel'den indir veya manuel set et)
export DATABASE_URL="<production pooler url>"
export DIRECT_URL="<production direct url>"

bun --filter @niyet/db migrate:prod
```

> `bun --filter @niyet/db seed` üretimde **çalıştırma** — gerçek kullanıcı verisi olduğunda overwrite olur. Demo veriyi yalnızca dev/staging'de seed et.

### Supabase Realtime Publication

İlk Supabase project setup'ında manuel SQL gerekli:

```bash
psql "$DIRECT_URL" -f packages/db/prisma/migrations/manual/enable-realtime.sql
```

---

## 5. Monitoring

Vercel Dashboard'tan:

- **Analytics**: trafik, sayfa görüntüleme
- **Speed Insights**: Core Web Vitals (FCP, LCP, CLS)
- **Logs**: server-side log akışı (Prisma query'leri, Gemini call'ları)
- **Deployments**: tüm build geçmişi + rollback

Sorun olursa Supabase Dashboard'tan:

- Postgres logs
- Realtime monitor (aktif kanallar)
- Auth events

---

## 6. Sorun Giderme

### "Module not found: @niyet/core"

Build sırasında workspace package'lar resolve olmadıysa. `vercel.json` doğru mu kontrol et — `installCommand` root'tan `bun install` çağırmalı.

### "Can't reach database"

Vercel runtime IPv6 desteklemez (eski direct connection format). Mutlaka **Transaction pooler (port 6543)** kullan, `db.PROJECT.supabase.co:5432` değil.

### "DIRECT_URL invalid"

Migration build sırasında çalışıyorsa (önerilmez). `vercel.json` build komutunda `prisma migrate deploy` ÇAĞIRMA — migration manuel yapılmalı.

### Build > 50 min timeout (Hobby plan)

Bun install + Prisma generate + Next.js build > 50 dk olursa Vercel Hobby'de fail olur. Çözüm: Pro plan (build limiti yok) veya Turborepo remote cache ekle.

---

## 7. Local Dev Server (Geliştirme İçin)

Vercel'siz, kendi makinende:

```bash
git clone https://github.com/yusufornek/niyet.git
cd niyet
bun install
cp .env.example .env.local  # değerleri doldur

bun --filter @niyet/db generate
bun dev  # tüm workspace'ler paralel başlar
```

<http://localhost:3030> açılır.

Dev sunucusu **her dosya değişikliğinde** otomatik yeniden derler (Next.js HMR). `Ctrl+C` ile kapatırsın.
