# CONTRIBUTING.md — Niyet'e Katkıda Bulunma Rehberi

> Bu dokümanı okumadan ilk PR'ını açma. **Süreç + format + kalite gate'leri** burada.

---

## 1. Geliştirme İş Akışı

### 1.1. Branching Stratejisi: Feature Branch + Manuel Merge
- **Default**: Her özellik/faz **kendi feature branch'inde** geliştirilir
- **Main'e direkt push YOK** — main yalnızca onaylı merge'lerle güncellenir
- Branch push edilince proje sahibi gözden geçirir ve "merge" onayı verir → **squash-merge**
- Branch isimlendirme: `<tip>/<kısa-açıklama>` (Conventional Commits tipleri):
  - `feat/<topic>` — yeni özellik (örn: `feat/web-foundation`, `feat/gemini-pipeline`)
  - `fix/<topic>` — bug fix
  - `chore/<topic>` — config/process (örn: `chore/branching-workflow`)
  - `docs/<topic>` — sadece doküman
  - `refactor/<topic>` — yeniden organizasyon
- Branch ömrü kısa olsun (1-3 gün ideal); merge edilene kadar `git rebase main` ile güncel tut

> **Karar gerekçesi**: Demo süresi 2+ ay; jüriye link verilecek; main her an demo-edilebilir kalmalı. Proje sahibinin manuel onayı kalite/kapsam kontrolü sağlar. Detay: `MEMORY.md` ADR-009.

### 1.2. Commit Mesajları: Conventional Commits

```
<tip>(<scope>): <subject>

<body opsiyonel>

<footer opsiyonel>
```

**Tipler**:
| Tip | Anlam |
|---|---|
| `feat` | Yeni özellik |
| `fix` | Bug fix |
| `docs` | Sadece dokümantasyon değişikliği |
| `style` | Format (whitespace, semicolons), kod davranışı değişmedi |
| `refactor` | Davranış aynı, kod yeniden organizasyon |
| `perf` | Performans iyileştirmesi |
| `test` | Test ekleme/düzeltme |
| `build` | Build sistemi veya external dependency'ler |
| `ci` | CI yapılandırması |
| `chore` | Diğer (config, dosya rename, vs.) |
| `revert` | Önceki commit'i geri al |

**Scope'lar** (`commitlint.config.js`'te tanımlı):
`web`, `db`, `graphql`, `ai`, `core`, `ui`, `config`, `auth`, `docs`, `ci`, `deps`, `monorepo`, `spending`, `goals`, `score`, `circles`, `chatbot`

**Örnekler**:
```bash
git commit -m "feat(spending): Gemini function calling pipeline ekle"
git commit -m "fix(auth): redirect loop login sonrası"
git commit -m "docs(memory): ADR-009 GraphQL caching kararı"
git commit -m "refactor(core): future score hesabını pure function'a böl"
```

**Komitlint zorunlu**: Husky `commit-msg` hook'u format dışı commit'i reddeder.

### 1.3. Pre-Push Kalite Gate'i
Her `git push` öncesi Husky pre-push hook çalışır:
```bash
bun run lint
bun run type-check
bun run test:quick   # sadece hızlı unit testler
```
Hata varsa push reddedilir. `--no-verify` kullanma (acil durumlar hariç, sonrasında düzelt).

---

## 2. Pull Request Süreci (Opsiyonel)

### 2.1. PR Açmadan Önce
- [ ] `bun run lint && bun run type-check && bun run test` lokalde geçiyor
- [ ] Branch güncel: `git pull --rebase origin main`
- [ ] PR template (otomatik gelir) doldurulmuş
- [ ] Yeni davranış için test var

### 2.2. PR Template
`.github/PULL_REQUEST_TEMPLATE.md` otomatik açılır:
- **Açıklama**: Ne değişti, neden?
- **Etki Alanı**: Hangi paketler/ekranlar etkileniyor?
- **Test Planı**: Nasıl test edildi?
- **Ekran Görüntüsü** (UI değişikliği varsa)
- **Doc Güncellemesi Gerekti mi?**

### 2.3. Review Süreci
- 1 zorunlu reviewer (proje sahibi veya modül owner)
- CI yeşil olmadan merge yok
- Merge yöntemi: **Squash merge** (linear history)
- Review SLA: 24 saat (CI yeşilse)

---

## 3. Kod Kalite Standartları

(Detay: `ENGINEERING.md`)

### 3.1. Linting & Formatting
- ESLint config: `packages/config/eslint-config`
- Prettier: root `.prettierrc`
- Otomatik fix: `bun run format && bun run lint --fix`
- Pre-commit (lint-staged): değişen dosyalar otomatik formatlanır

### 3.2. TypeScript
- `strict: true` her yerde
- `any` yasak (zorunluysa `unknown` + narrow)
- Public API'lerde explicit return type
- Zod ile boundary validation

### 3.3. React / Next.js
- Server Components default, `'use client'` sadece gerekli yerde
- Component dosyası: `kebab-case.tsx`, component: `PascalCase`
- Props interface ayrı: `interface ButtonProps { ... }`
- Hooks: `useFooBar` (camelCase, `use` prefix)

### 3.4. GraphQL
- Pothos code-first
- Mutation input'ları Zod ile validate
- Authorization Pothos auth-scopes plugin ile
- N+1 önle: Prisma plugin DataLoader pattern otomatik

---

## 4. Test Politikası

(Detay: `ENGINEERING.md` §7)

### 4.1. Coverage Hedefleri
- **Pure functions** (`packages/core`): %90+ unit coverage hedefi
- **GraphQL resolvers**: kritik path'leri integration test
- **UI components**: minimum smoke test
- **E2E**: 1-2 critical happy path (Playwright)

### 4.2. Test Adlandırma
- `*.test.ts` veya `*.spec.ts`
- Türkçe `describe`/`it` (test kendi anlatımı)

---

## 5. Issue / Bug Açma

Template'ler: `.github/ISSUE_TEMPLATE/`

### 5.1. Bug Report Şablonu
- **Durum**: Ne oldu?
- **Beklenen**: Ne olmalıydı?
- **Adımlar**: Nasıl reproduce edilir?
- **Ortam**: Browser, OS, Vercel preview URL
- **Screenshot/log** (varsa)

### 5.2. Feature Request Şablonu
- **Problem**: Hangi user pain'i çözüyor?
- **Önerilen çözüm**: Nasıl çalışsın?
- **Alternatifler**: Hangi yaklaşımları düşündün?
- **Etki**: Kimler etkilenir, hangi modüller?

### 5.3. Issue Label'ları
- `bug`, `feature`, `chore`, `docs`, `tech-debt`
- `priority:high|medium|low`
- `area:web|db|ai|graphql|core`
- `good-first-issue` (onboarding için)

---

## 6. CI/CD Detayı

### 6.1. GitHub Actions (Her Push)
- `.github/workflows/ci.yml`
- Adımlar: install (bun cache) → lint → type-check → vitest
- Cache: Turborepo remote cache + bun cache
- Bütçe: <5 dakika

### 6.2. PR'larda Ek Adımlar
- Playwright e2e (smoke)
- Vercel preview deploy (otomatik)
- Lighthouse CI (opsiyonel, Faz 8'de)

### 6.3. Main'e Merge Sonrası
- Vercel production deploy
- Discord/Slack notification (opsiyonel)

---

## 7. Dependency Yönetimi

### 7.1. Yeni Dependency Eklerken
- "Gerçekten gerek var mı?" sor (Bundle bloat'a karşı)
- Aktif maintain ediliyor mu? (Son commit, issue cevap süresi)
- License uygun mu? (MIT, Apache-2.0 ✓; GPL ⚠️)
- Bundle impact: `bunx bundle-phobia <pkg>`
- Hangi package'a ekleniyor? Workspace boundary'leri:
  - UI deps → `apps/web`
  - DB deps → `packages/db`
  - AI deps → `packages/ai`
  - Cross-cutting Zod, date-fns vs → `packages/core`

### 7.2. Dependency Update
- `bun update` ile minor/patch
- Major updates için ayrı PR + changelog incele

---

## 8. Doc Güncelleme Sözleşmesi

Şu durumlarda **PR'da doc güncellemek zorunlu**:
- Yeni dependency: `package.json` + `README.md` setup notu
- Yeni env var: `.env.example` + `README.md`
- Yeni komut/script: `README.md`
- Architectural karar: `MEMORY.md`'ye yeni ADR
- Domain model değişimi: `ARCHITECTURE.md` + `CLAUDE.md`
- Süreç değişimi: `CONTRIBUTING.md`

PR template'inde "Doc güncellendi mi?" checkbox'u var.

---

## 9. Yardım & İletişim

- **Anlık sorular**: Slack/Discord (link: <add>)
- **Mimari tartışma**: GitHub Discussions
- **Bug**: GitHub Issues
- **Acil**: Yusuf'a direkt mesaj (@yusufornek)

---

**Niyet'e katkın için teşekkürler! Temiz kod, açık niyet.**
