# AGENTS.md — Niyet'te Çalışan Herkes İçin Hızlı Başlangıç

> Bu dosya **insan veya AI agent** fark etmez — Niyet repo'sunda kod yazacak herkesin **ilk okuduğu** dosyadır. Detaylı kurallar için `CLAUDE.md` ve `CONTRIBUTING.md`.
>
> **Temel kural**: Branch protection YOK. Herkes kendi başına branch açıp PR açıp merge edebilir. Disiplin teknik engele değil, **bu dosyadaki adımlara** dayanıyor.

---

## 0. Sen kimsin?

- **İnsan**: Bu dosyayı okuyup adımları takip et.
- **AI agent** (Claude Code, Cursor, Aider, Codex CLI, vs.): Aşağıdaki **§5 onboarding prompt'unu** oturumunun başında kendi context'ine al; sonra adımları izle.

---

## 1. Çalışmaya Başlamadan Önce (HER YENİ İŞTE — ZORUNLU)

Bu 3 komutu **branch açmadan önce mutlaka çalıştır**. Atlamak = çakışma garantisi.

```bash
git checkout main
git pull --rebase origin main           # main'in en güncel halini al
gh pr list --state open                 # başka kim ne üzerinde çalışıyor görmek için
bun install                             # deps senkron olsun
bun run lint && bun run type-check      # baseline yeşil mi? (kırmızıysa main bozuk — Yusuf'a bildir)
```

> **Neden pull zorunlu?** Sen branch açtıktan sonra başka biri main'e bir PR merge edebilir. Eski main üzerinden çalışırsan merge zamanı conflict yaşarsın. Önce pull, sonra branch.

---

## 1.5. Çakışma Riski Varsa — Paralel Çalışma Protokolü

Eğer `gh pr list --state open` çıktısı **§4'teki shared file matrix'ten** bir dosyaya dokunan açık PR gösteriyorsa, aşağıdaki sıralamayı uygula.

### Erken Draft PR (≥1 saat sürecek iş için zorunlu)

Branch'i açar açmaz **draft PR aç** (commit yokken bile boş PR olur veya ilk commit'le):

```bash
git checkout -b feat/<senin-konun>
git commit --allow-empty -m "chore(<scope>): WIP <konu>"
git push -u origin feat/<senin-konun>
gh pr create --draft --title "WIP: <konu>" --body "Dokunulacak dosyalar: <liste>. Bu PR'ı <agent> açtı."
```

Bu sayede paralel çalışan agent/insan **erken görür**, çakışma önceden konuşulur.

### Çakışma Resolve Sırası (kim kazanır?)

1. **Önce açan kazanır** — daha eski PR (timestamp) merge önceliğini alır.
2. İstisna: birinin PR'ı **küçük diff + 1 satır** ise ve diğerininki **büyük** ise küçük olan önce merge edilir, büyük olan rebase eder. Yusuf onayı şart.
3. Eşit durumdaysa **`schema.prisma`'ya dokunan kazanır** (en kritik, rebase'i en zor).
4. Karar verilemiyorsa: **DUR**, Yusuf'a (`@yusufornek`) sor.

### İletişim Kanalı

Paralel agent ile koordinasyon için sırasıyla:

1. **PR comment** — açık PR'a "Ben de bu dosyaya dokunacağım, sıralayalım mı?" yorumu (kalıcı, herkes görür).
2. **Issue açıklaması** — büyük scope ise GitHub Issue (multi-PR planı).
3. **Yusuf'a doğrudan mesaj** — sözlü/Slack/Discord (acil çözüm).

> PR comment **default** kanaldır. GitHub'da iz bırakır, audit edilebilir.

### Stale Branch (terkedilmiş branch)

Bir agent branch açıp **48 saatten fazla** commit atmadıysa branch "stale" sayılır. Devralma sırası:

1. Yusuf'a "Bu branch ölü mü?" diye sor.
2. Yusuf "evet, devral" derse: lokalde checkout et, kendi commit'lerini ekle, push et (mevcut branch üzerine). PR description'a "Önceki agent (X) devralındı" yaz.
3. Yusuf onayı yoksa **kendi branch'in açıp parallel çalış** — orijinal branch sahibini PR comment ile bilgilendir.

---

## 2. Yeni Bir İş (Branch → Commit → Push → PR → Merge)

Aşağıdaki adımları sırasıyla uygula. Kopyala-yapıştır.

> **Zorunlu kural**: Her yeni feature/iş için **yeni branch aç**. Eski feature branch'ine yeni feature ekleme.

```bash
# 1. Branch aç
# Format: <tip>/<konu-kebab-case>   (max ~50 karakter; çok uzunsa kısalt)
# Tipler: feat, fix, docs, refactor, chore, test, perf, ci
# Örnekler:
#   feat/web-onboarding-redesign
#   fix/graphql-auth-scope-leak
#   pbi/42-circle-invite-link        ← issue/ticket numarası varsa: <tip>/<num>-<konu>
git checkout -b feat/<senin-konun>

# 2. Çalış. Her mantıklı parça için AYRI commit at.
# Kuralı: bir commit revert edildiğinde başka bir şeyi kırmamalı.
# ÖNCE: `git status` ile değişen dosyaları gör, hangileri o commit'e gidecek listele.
git status                                       # dosyaları gör
git add <degisen-dosya-1> <degisen-dosya-2>     # ASLA `git add -A` veya `git add .`
git commit -m "feat(scope): kisa Turkce aciklama"

# Daha fazla commit:
git add <baska-dosyalar>
git commit -m "test(scope): yeni unit test"

# 3. Push (Husky pre-push burada otomatik lint+type-check+test çalıştırır)
git push -u origin feat/<senin-konun>

# 4. PR aç
gh pr create --fill

# 5. CI yeşil olunca self-merge
gh pr merge --squash --delete-branch

# 6. Yerel temizlik
git checkout main && git pull --rebase origin main
```

---

## 3. Commit Mesajı Formatı (commitlint ZORUNLU)

```
<tip>(<scope>): <kisa Turkce konu>

<opsiyonel body — niçin yaptın, ne'yi diff'te zaten görürüm>
```

**Tipler**: `feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert`

**Scope'lar** (`commitlint.config.js`'te): `web, db, graphql, ai, core, ui, config, auth, docs, ci, deps, monorepo, spending, goals, score, circles, chatbot`

**İyi örnekler**:

```
feat(goals): hedef olusturma formuna inflation slider ekle
fix(auth): login sonrasi redirect loop'u
docs(memory): ADR-013 — Vercel deploy stratejisi
refactor(core): future score hesabini pure function'a böl
```

**Kötü örnek**: `feat: bir suru sey` (scope yok, ne yaptığı belirsiz, birden fazla niyet karışmış)

---

## 4. Dikkat Edilecek Dosyalar (çakışma yüksek)

Bu dosyalara dokunmadan önce **`gh pr list --state open`** çalıştır — başka biri aynı dosyaya dokunan PR açmış mı bak. Açmışsa **bekle** veya kişiyle/agent ile konuş.

| Dosya                                  | Kural                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------- |
| `packages/db/prisma/schema.prisma`     | Aynı anda 1 PR dokunmalı. Migration timestamp sıralı olmalı.                        |
| `packages/db/prisma/migrations/**`     | Merge sonrası `git pull --rebase main` + `bun db:migrate` ile yeni timestamp üret.  |
| `packages/graphql/src/schema/index.ts` | Yeni domain dosyası ekle, `index.ts`'e **tek satır** ekle (en sona).                |
| `apps/web/lib/graphql/queries.ts`      | Yeni query'i **dosyanın sonuna** ekle. Mid-file edit yapma.                         |
| `packages/core/src/types.ts`           | Paylaşılan Zod şemaları. Yeni type'ı **dosyanın sonuna** ekle (append-only).        |
| `MEMORY.md`                            | Yeni ADR **dosyanın sonuna**, numara son ADR+1.                                     |
| `apps/web/components/ui/**`            | YASAK — manuel düzenleme yok. `bunx shadcn@latest add <component>` ile re-generate. |
| `.env.example`                         | Sadece sona yeni satır ekle (append-only).                                          |

---

## 5. AI Agent Onboarding Prompt (kopyala-yapıştır)

> Yeni bir AI agent oturumu (Claude Code, Cursor, vs.) başlatırken aşağıyı oturum başına ver:

```
ROL: Niyet repo'sunda kod yazacak AI agent'sın. Türk genç kullanıcılar
için AI destekli mikro emeklilik platformu. Demo aşaması — main her
zaman çalışır olmalı, jüriye verilen production URL canlı.

OKUMADAN İŞ YAPMA. Sırayla şu dosyaları oku:
1. AGENTS.md     ← bu dosya — koordinasyon
2. CLAUDE.md     ← proje özeti, kod konvansiyonları
3. CONTRIBUTING.md  ← detaylı iş akışı
4. ARCHITECTURE.md  ← sistem mimarisi
5. MEMORY.md     ← önceki kararlar (ADR)
6. ENGINEERING.md   ← mühendislik standartları

İŞ BAŞLAMADAN ÖNCE ÇALIŞTIR:
$ git status                           # working tree temiz mi?
$ git checkout main
$ git pull --rebase origin main        # main güncel mi?
$ gh pr list --state open              # paralel çalışan var mı?
$ bun install
$ bun run lint && bun run type-check   # baseline yeşil mi?

KURALLAR:
- Conventional Commits zorunlu (commit-msg hook reddeder).
- Branch isim formatı: <tip>/<konu-kebab>. main'e direkt push YASAK.
- 1 PR = 1 mantıksal değişiklik. Karışık PR yapma.
- Husky pre-push çalışacak (lint + type-check + test). --no-verify YASAK.
- §4 shared file matrix'e bak — kritik dosyalara dokunmadan önce açık PR ara.
- Türkçe commit mesajı + UI metni; kod identifier'ları İngilizce.
- Her edit sonrası ilgili lint/type-check çalıştır.
- §4'teki dosyalar için append-only çalış (yeni satır sona).
- Commit author trailer'ı ekle (kanonik isim listesi):
  * Claude Code → `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
  * Cursor       → `Co-Authored-By: Cursor <noreply@cursor.sh>`
  * Aider        → `Co-Authored-By: Aider <noreply@aider.chat>`
  * Codex CLI    → `Co-Authored-By: OpenAI Codex <noreply@openai.com>`
  * Diğer        → `Co-Authored-By: <Tool adı> <noreply@<domain>>` formatı
- PR açıklamasında "Bu PR'ı <agent adı> yazdı, <kullanıcı> denetledi" yaz.
- COMMIT AMEND POLİTİKASI: Yeni commit at, **`--amend` kullanma**. Sebep: amend
  önceki commit'i sessizce override eder; pre-push hook fail sonrasi düzeltirken
  iş kaybı riski var. Yeni commit (`git commit -m "fix(...): tipo"`) her zaman
  güvenli yol. Squash-merge zaten temizler.

SELF-MERGE: Branch protection KAPALI, kendin merge edebilirsin AMA
şu kontrol listesi tüm madde ✓ olmadan merge YAPMA:
□ CI yeşil mi?
□ PR description doldu mu (etki + test planı)?
□ Conventional Commits formatı doğru mu?
□ §4'teki shared dosyalardan birine dokunduysan başka açık PR var mı kontrol ettin mi?
□ Vercel preview yeşil mi?

DURMA KOŞULLARI (stop):
- Pre-push hook fail → DURMA, root cause bul. --no-verify YASAK.
- Schema migration conflict → DURMA, kullanıcıya rapor.
- Secret/.env git'e girdi → DURMA, kullanıcıya rapor.
- Production kırıldı → DURMA, §6 hotfix.
- Self-merge checklist 1 madde ✗ → DURMA, kullanıcıya sor.

ÇIKTI: Her oturum sonunda 3 satırlık rapor:
- Hangi branch?
- Hangi commit'ler atıldı (kısa liste)?
- PR linki + merge durumu?
```

---

## 6. Hata Olursa

| Senaryo                                          | Ne yap                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| **Pre-push fail** (lint/type-check/test kırıldı) | Hata mesajını oku, kodu düzelt, **yeni commit** at (`--amend` kullanma — §5'e bak), tekrar push. `--no-verify` **ASLA**. |
| **CI fail** (GitHub Actions kırmızı)             | Log'a bak, fix at, yeni commit push. CI'yi tekrar tetikler.                                                              |
| **Rebase sırasında conflict**                    | `git status` ile conflict'li dosyaları gör, manuel çöz, `git add`, `git rebase --continue`.                              |
| **Production (Vercel) kırıldı**                  | Aşağıdaki §6.1 hotfix akışını izle.                                                                                      |
| **Emin değilsin**                                | **DUR**. Yusuf'a (`@yusufornek`) sor. Yanlış action geri alınamayabilir.                                                 |

### 6.1. Production Hotfix Akışı

Vercel'de canlı uygulama (https://niyet-web.vercel.app) kırıldıysa:

```bash
# 1. Hata log'larını al
vercel logs niyet-web --prod                          # Vercel CLI (yüklü değilse:)
# Dashboard: https://vercel.com/<team>/niyet-web → Logs → Production

# 2. Hotfix branch (main'den)
git checkout main && git pull --rebase origin main
git checkout -b fix/<scope>-hotfix-<konu>

# 3. Minimum diff (refactor YOK, sadece kırığı düzelt)
# ... düzelt ...

# 4. Lokal smoke + push + PR + merge
bun --filter @niyet/web build
git add <fixed-files>
git commit -m "fix(<scope>): <kısa hotfix açıklaması>"
git push -u origin fix/<scope>-hotfix-<konu>
gh pr create --fill --title "fix(<scope>): <konu> hotfix"
gh pr merge --squash --delete-branch

# 5. Prod doğrula
curl -I https://niyet-web.vercel.app/<kırılan-path>
```

### 6.2. Hotfix de Kırılırsa — Rollback

```bash
# Seçenek A — Vercel'den son çalışan deploy'a dön (hızlı, kod değişmez)
# Dashboard → Deployments → en son yeşil olanı bul → "Promote to Production"

# Seçenek B — Git revert (kod history'sinde de izi temizle)
git checkout main && git pull --rebase origin main
git revert <hotfix-merge-sha> --no-edit
git push origin main           # branch protection kapalı, direkt push çalışır
```

Seçenek A **default** (kod history'yi kirletmez); B kod-level rollback gerekiyorsa.

### 6.3. Postmortem Template (`MEMORY.md` sonuna)

Her production hotfix sonrası **MEMORY.md'ye** aşağıdaki formatta ADR ekle (numara son ADR+1):

```markdown
## ADR-<NUM>: <Kısa olay başlığı> (Postmortem)

**Tarih**: 2026-MM-DD
**Severity**: P0 / P1 / P2 (P0=prod down, P1=major degradation, P2=minor)
**Süre**: <X dakika> (kırılma → düzelme)

### Ne oldu?

<1-2 cümle olay özeti>

### Kök neden

<gerçek teknik sebep — "X dosyasında Y satırı Z koşulunda fail oluyordu">

### Düzelme

<yapılan minimum diff — commit/PR linki>

### Önlem (recurrence prevention)

<test eklendi mi? hook eklendi mi? doc güncellendi mi? — somut aksiyon>
```

### 6.4. İletişim Kanalı (Acil Durum)

| Severity                                              | Kanal                                                     | Beklenen yanıt |
| ----------------------------------------------------- | --------------------------------------------------------- | -------------- |
| **P0** (prod tamamen down)                            | Doğrudan Yusuf'a (`@yusufornek`) — Slack/Discord/WhatsApp | ~15 dakika     |
| **P1** (kısmen kırık, login OK ama bir feature kırık) | GitHub Issue + `priority:high` label, Yusuf'a not         | ~2 saat        |
| **P2** (cosmetic / minor)                             | Normal PR akışı, Issue açma                               | 24-48 saat     |

Demo öncesi (jüri günü) bütün severity'ler P0/P1 sayılır — derhal Yusuf'a bildir.

---

## 7. Niyet Hakkında Hızlı Hatırlatma

- **Türkçe** her şey: commit, UI, PR description. Kod identifier'ları İngilizce.
- Production URL: https://niyet-web.vercel.app — main'e her merge otomatik deploy eder.
- Mock olan tek şey: **harcama verisi**. Auth, DB, AI (Gemini), Realtime — hepsi gerçek.
- Dosya sahipliği: detay `CLAUDE.md §1.4` — `packages/db` Prisma'ya, `packages/graphql` Pothos'a, `packages/ai` Gemini'ye sahip.

---

**Tek cümle**: pull et, branch aç, küçük commit'ler at, push et (Husky senin yerine kontrol eder), PR aç, CI yeşilse merge et, branch'i sil. Şüphe varsa Yusuf'a sor.
