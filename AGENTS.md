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
```

> **Neden pull zorunlu?** Sen branch açtıktan sonra başka biri main'e bir PR merge edebilir. Eski main üzerinden çalışırsan merge zamanı conflict yaşarsın. Önce pull, sonra branch.

---

## 2. Yeni Bir İş (Branch → Commit → Push → PR → Merge)

Aşağıdaki adımları sırasıyla uygula. Kopyala-yapıştır.

```bash
# 1. Branch aç
# Format: <tip>/<konu-kebab-case>
# Tipler: feat, fix, docs, refactor, chore, test, perf, ci
git checkout -b feat/<senin-konun>

# 2. Çalış. Her mantıklı parça için AYRI commit at.
# Kuralı: bir commit revert edildiğinde başka bir şeyi kırmamalı.
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
- Commit author trailer'ı ekle: "Co-Authored-By: <Agent adı> <noreply@...>"
- PR açıklamasında "Bu PR'ı <agent adı> yazdı, <kullanıcı> denetledi" yaz.

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

| Senaryo                                          | Ne yap                                                                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| **Pre-push fail** (lint/type-check/test kırıldı) | Hata mesajını oku, kodu düzelt, `git commit --amend` veya yeni commit, tekrar push. `--no-verify` **ASLA**.         |
| **CI fail** (GitHub Actions kırmızı)             | Log'a bak, fix at, yeni commit push. CI'yi tekrar tetikler.                                                         |
| **Rebase sırasında conflict**                    | `git status` ile conflict'li dosyaları gör, manuel çöz, `git add`, `git rebase --continue`.                         |
| **Production (Vercel) kırıldı**                  | `fix/<scope>-hotfix-<desc>` branch aç, minimum diff yap, merge et. Sonra `MEMORY.md`'ye 1 paragraf postmortem ekle. |
| **Emin değilsin**                                | **DUR**. Yusuf'a (`@yusufornek`) sor. Yanlış action geri alınamayabilir.                                            |

---

## 7. Niyet Hakkında Hızlı Hatırlatma

- **Türkçe** her şey: commit, UI, PR description. Kod identifier'ları İngilizce.
- Production URL: https://niyet-web.vercel.app — main'e her merge otomatik deploy eder.
- Mock olan tek şey: **harcama verisi**. Auth, DB, AI (Gemini), Realtime — hepsi gerçek.
- Dosya sahipliği: detay `CLAUDE.md §1.4` — `packages/db` Prisma'ya, `packages/graphql` Pothos'a, `packages/ai` Gemini'ye sahip.

---

**Tek cümle**: pull et, branch aç, küçük commit'ler at, push et (Husky senin yerine kontrol eder), PR aç, CI yeşilse merge et, branch'i sil. Şüphe varsa Yusuf'a sor.
