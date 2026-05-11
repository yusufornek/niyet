# SECURITY.md — Niyet Güvenlik Politikası

> Niyet finansal verilerle ilgileniyor. Şu anda **mock data** ile demo aşamasında; ileride gerçek banka entegrasyonuna geçişe **hazır mimariyle** inşa ediyoruz. Bu doküman temel güvenlik prensiplerini ve KVKK uyumu yaklaşımını anlatır.

---

## 1. Tehdit Modeli (Demo Aşaması)

| Aktör | Motivasyon | Mitigation |
|---|---|---|
| Anonim attacker | Veri çalma, sistemi yıkma | Auth zorunlu; RLS; rate limit |
| Bot (otomatik) | Rate abuse, scraping | Rate limit, Cloudflare Turnstile (gerekirse) |
| Curious jury user | Başka jüri verisini görme | Session isolation; her jüri kendi auth'lu session'ında |
| Insider (ekip) | Yanlışlıkla prod data sızdırma | Service role key ekipte 2 kişide; audit log |
| Gemini API breach | Prompt injection, data leak | Sanitize input; PII filter; no secrets in prompt |

> **Gerçek banka entegrasyonu geldiğinde** tehdit modeli genişler: PCI DSS, ISO 27001, BDDK regülasyonu, fraud detection vs. Şimdi temel atıyoruz.

---

## 2. Secrets Yönetimi

### 2.1. Asla Repo'ya Commit Etme
- `.env.local`, `.env.production` gitignored
- `.env.example` sadece **placeholder** içerir (gerçek key yok)
- Pre-commit hook secret regex'le tarayabilir (gerekirse `trufflehog`)

### 2.2. Üretim Secrets
- **Vercel Dashboard** ortamı: production ve preview ayrı env scope
- **Supabase Service Role Key**: yalnızca server-side env (NEXT_PUBLIC_* prefix YOK)
- **Gemini API Key**: server-side only (client'tan asla çağrılmaz; her zaman backend proxy üzerinden)
- Rotation policy: 6 ayda bir keyleri rotate et (incident veya ekip değişikliğinde anında)

### 2.3. Local Development
- Her geliştirici **kendi Gemini API key**'ini kullanır (free tier yeterli)
- Local Supabase: ya shared dev project (read-only) ya da local Supabase CLI ile self-hosted

---

## 3. Authentication

### 3.1. Supabase Auth Kullanımı
- Email + password (default)
- OAuth: Google, GitHub (yarışma sonrası eklenir)
- JWT, HttpOnly Secure SameSite cookie
- Refresh token rotation

### 3.2. Demo User Erişimi
- Jüri için: anonymous magic link veya guest token (Faz 2'de kararlaştırılacak)
- Her jüri kendi session'ında ama **aynı seed data**'yı görür (Ayşe persona) — UI seviyesinde "Demo modu" yazısı
- Multi-tenancy gerçek auth tabanlı; jüri user'ları RLS ile birbirini görmez

---

## 4. Authorization

### 4.1. Row Level Security (RLS) — Veri Katmanı
Supabase Postgres'te **her tablo** RLS aktif. Default policy: `auth.uid() = userId`.

Örnek policy (Transaction tablosu için):
```sql
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_transactions"
  ON "Transaction" FOR SELECT
  USING (auth.uid() = "userId");

CREATE POLICY "users_update_own_transactions"
  ON "Transaction" FOR UPDATE
  USING (auth.uid() = "userId");
```

> **Prisma + RLS gotcha**: Prisma service role key ile bağlanırsa RLS bypass olur. Authorization GraphQL resolver seviyesinde Pothos auth-scopes ile **ayrıca** zorlanır.

### 4.2. GraphQL Authorization
- Pothos `authScopes` her field için zorunlu
- Authenticated `me` resolver'ında JWT'den user çıkarılır
- Mutation'lar `authenticated` scope zorunlu
- Admin operasyonları (`runBackgroundScoreUpdate`) `admin` scope

### 4.3. Authorization Test
- Unit test: her resolver için "unauth user reddedilir mi?" testi
- Integration: başka user'ın transaction'ını okumaya çalış → 403

---

## 5. Input Validation

### 5.1. Boundary Validation
Tüm harici input Zod ile parse:
- HTTP request body (GraphQL mutation input)
- Query string parametreler
- WebSocket/Realtime payload
- Gemini function call args
- Env vars (boot time)

```ts
const RunAnalysisInputSchema = z.object({
  forceRefresh: z.boolean().optional().default(false),
});
```

### 5.2. SQL Injection
- **Prisma parameterized query'ler kullanır** → SQL injection imkansız
- Raw query (`$queryRaw`) **yasak** (gerekirse ayrı review)

### 5.3. XSS
- React JSX auto-escape
- Raw HTML injection (örn. `d4ngerouslySetInnerHTML` benzeri prop) **yasak**
- Markdown render'ı varsa: `rehype-sanitize` kullan
- URL parametreler: `encodeURIComponent`

### 5.4. CSRF
- Next.js Server Actions CSRF token built-in
- SameSite=Lax cookie default
- Cross-origin GraphQL request'leri için CORS whitelist

---

## 6. Data Privacy (KVKK Uyumu)

> KVKK (Kişisel Verilerin Korunması Kanunu) — Türkiye'nin GDPR muadili. Niyet finansal veri işlediği için bu çok kritik.

### 6.1. Açık Rıza Prensibi
- **İlk veri toplama** öncesi consent ekranı (mevcut mockup'ta var)
- "Hangi veriler işlenecek?" şeffaflığı: kategori, tutar, tarih, merchant
- "Hangi verilerin işlenmediği?" şeffaflığı: hesap bakiyesi, gerçek kart no
- Consent kaydı DB'de (`User.consentAcceptedAt`, `consentVersion`)

### 6.2. Veri Minimizasyonu
- **Toplanan veri** sadece feature için gerekli olan
- Mock data zaten minimum (gerçek API'ye geçişte: hangi field'lar bizim?)
- Eski analiz sonuçları periyodik temizlenir (örn: 1 yıldan eski `AnalysisRun` silinir — kullanıcı isterse)

### 6.3. Bağlantıyı Kesme Hakkı
- Mockup'ta "Settings → Banka bağlantısını kes" var
- Tek tık ile `BankConnection.active = false`
- Veri silme: kullanıcı isterse tüm `Transaction` + `AnalysisRun` cascade delete
- "Account silme" feature'ı Faz 7'de

### 6.4. Veri İhlali Süreci
Eğer bir incident olursa:
1. Süreyi durdur, etkilenen kullanıcıları belirle
2. KVKK kuruma 72 saat içinde bildirim (gerçek üretime geçildiğinde)
3. Etkilenen kullanıcılara email
4. Post-mortem ve mitigation

### 6.5. Veri Yerleşimi
- Supabase region: **Avrupa** (örn: eu-central-1) tercih edilir, EU GDPR + KVKK uyumu için
- Gemini: Google Cloud sırasıyla yer seçilebilir; varsayılan US olabilir → veri transferi sözleşmesi gerekli (üretime geçişte)

---

## 7. Audit Logging

### 7.1. Loglanan Kritik Aksiyonlar
- Login (başarılı/başarısız)
- Banka bağlantısı (connect/disconnect)
- `runAnalysis` her çağrı (`AnalysisRun` zaten log)
- `editTransactionCategory` (kullanıcı feedback signal'i)
- `acceptSavingOpportunity` (para hareketi simülasyonu)
- Goal create/update/delete

### 7.2. Log Yapısı
```json
{
  "timestamp": "2026-05-11T12:34:56Z",
  "userId": "abc123",
  "action": "BANK_DISCONNECTED",
  "metadata": { "bankConnectionId": "..." },
  "ip": "[REDACTED in prod]",
  "userAgent": "..."
}
```

### 7.3. Log Retention
- Dev: stdout (Vercel logs, 7 gün)
- Prod: log aggregator (Faz 7+'da: Axiom, Better Stack veya self-hosted Loki)

---

## 8. Rate Limiting

### 8.1. Hedef
DoS, scraping, abuse'a karşı koruma.

### 8.2. Strateji (Demo'da Minimal)
- GraphQL `/api/graphql` endpoint'ine **Vercel Edge Middleware** ile basit rate limit:
  - 100 request / dakika / IP
  - 10 mutation / dakika / user
- AI mutation'lara özel limit:
  - `runAnalysis`: 10 / saat / user (cost control)
  - `chatbotMessage`: 60 / saat / user

### 8.3. Implementation (Faz 6-7)
- `@upstash/ratelimit` + Vercel KV
- Cevap header'larda `X-RateLimit-Remaining`, `Retry-After`

---

## 9. AI Specific Security

### 9.1. Prompt Injection Koruması
- User input'lar prompt'a doğrudan enjekte edilmez; structured field'larda taşınır
- "Ignore previous instructions" tarzı attack'lara karşı sistem prompt'u robust
- Sensitive operasyonlar (transaction silme, account silme) AI tarafından **otomatik** çağrılamaz; kullanıcı UI üzerinden onaylar

### 9.2. PII Sızıntısı
- Kullanıcı adı/email/tutar Gemini'ye yalnızca **gerekiyorsa** gider
- Tutarsız: transaction tutarı analiz için zorunlu → gider ama Gemini'nin loglarda saklayabileceği bilinir, KVKK aydınlatma metni bunu kapsar

### 9.3. Hallucination Boundary
- Gemini "transaction yarat" gibi yan etkiler üretemez (function call schema sınırlandırır)
- Önerdiği tutar > kullanıcının gerçek harcaması ise sanity check reddeder

---

## 10. Sorumlu Açıklama (Responsible Disclosure)

Bir güvenlik açığı bulduysan **public bug açma**. Doğrudan iletişim:
- Email: <security@niyet.app> (henüz aktif değil)
- Yusuf'a private message (@yusufornek)

7 gün içinde yanıt verilir. Cevap sonrası 30 gün düzeltme süresi; sonra koordineli açıklama.

---

## 11. Güvenlik Roadmap

| Faz | Eklenecek |
|---|---|
| **Demo (şimdi)** | Auth, RLS, env secrets, Zod validation, audit log skeleton |
| **Pilot** | Rate limiting, MFA, structured logging, retention policy |
| **Production (gerçek banka)** | PCI DSS scope analizi, BDDK uyumu, fraud detection, encryption at rest (Supabase default), penetration test |
| **Scale** | SOC 2 audit, ISO 27001, bug bounty programı |

---

## 12. Kontrol Listesi (Her Sürüm Öncesi)

- [ ] `.env.example` güncel, gerçek secret yok
- [ ] Yeni endpoint için authorization yazıldı
- [ ] Yeni mutation için audit log var
- [ ] RLS policy yeni tablolarda aktif
- [ ] Input validation Zod ile yapıldı
- [ ] User-facing error mesajı stack trace içermiyor
- [ ] Dependency audit temiz: `bun audit`
