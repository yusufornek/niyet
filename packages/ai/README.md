# @niyet/ai

> Gemini AI entegrasyonu. **Agentic** pattern'lar burada — function calling, multi-step reasoning, AI Saving Coach.

**Faz 5'te doldurulacak**:
- `src/client.ts` — Google Gen AI SDK client (Gemini 2.5 Flash)
- `src/functions/` — Gemini function definitions (set_category, mark_subscription, ...)
- `src/prompts/v1/` — System prompts (Türkçe, few-shot)
- `src/pipelines/` — Spending Analyzer, Goal Forecaster (Pattern A, C)
- `src/agents/` — AI Saving Coach (Pattern B, multi-turn agent)
- `src/index.ts` — Public API

## Agentic Pattern'lar (Detay: ENGINEERING.md §12)

### Pattern A — Spending Analyzer (Single-shot batch)
Kullanıcının 90 günlük transaction'larını batch olarak Gemini'ye gönderir; her transaction için 0-N function call yapılır (kategori atama, abonelik işaretleme, azaltılabilir flag, mikro tasarruf önerisi). Sonuçlar DB'ye yazılır.

### Pattern B — AI Saving Coach (Multi-turn agent loop)
Chatbot. Kullanıcı sorusu → Gemini'ye gider → tool call yapabilir (DB query, hesap simülasyonu) → sonuç tekrar context'e döner → final cevap stream edilir. Bounded autonomy: max 5 iteration.

### Pattern C — Goal Forecaster
Enflasyon + fiyat geçmişi + katkı oranı bilgisini tool'lar ile çekip "hedefe X tarihte ulaşırsın" projection üretir.

### Pattern D — Future Score Updater (Pure logic, AI değil)
Pure functions ama agent organizasyonu pattern'ı kullanır.

## Evaluation Suite

`evals/` altında ground truth ile karşılaştırma test'leri. Çalıştırma: `bun --filter @niyet/ai eval` (Faz 8'de).
