/**
 * Gemini Function Calling — 4 tool definition.
 *
 * Spending Analyzer Agent (Pattern A) bu fonksiyonları çağırır:
 *  - set_transaction_category: kategori atama (15 sabit enum'dan)
 *  - mark_as_subscription: düzenli abonelik tespit
 *  - flag_reducible: azaltılabilir harcama + tutar
 *  - recommend_micro_saving: aksiyon önerisi (UI'da gösterilir)
 *
 * Schema'lar Zod ile de tanımlı (packages/core/types.ts) — validation
 * iki yerden de geçer (boundary + Gemini SDK).
 */
import { SPENDING_CATEGORIES } from '@niyet/core';
import { Type, type FunctionDeclaration } from '@google/genai';

export const SET_CATEGORY_FUNCTION: FunctionDeclaration = {
  name: 'set_transaction_category',
  description:
    "Bir transaction'ı 15 sabit kategoriden birine atar. Merchant adı, tutar ve tarihten yola çıkarak en uygun kategoriyi seçer.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      transaction_id: {
        type: Type.STRING,
        description: 'Transaction ID (cuid)',
      },
      category: {
        type: Type.STRING,
        enum: [...SPENDING_CATEGORIES],
        description: '15 sabit Türkçe kategoriden biri',
      },
      reasoning: {
        type: Type.STRING,
        description: 'Bu kategoriyi neden seçtiğin (1-2 cümle Türkçe)',
      },
    },
    required: ['transaction_id', 'category', 'reasoning'],
  },
};

export const MARK_SUBSCRIPTION_FUNCTION: FunctionDeclaration = {
  name: 'mark_as_subscription',
  description:
    "Aynı merchant'tan tekrar eden ödemeyi (Netflix, Spotify, ChatGPT vs.) abonelik olarak işaretler. Aynı merchant son 90 günde 2+ ödeme yapmışsa.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      transaction_id: {
        type: Type.STRING,
        description: 'Transaction ID',
      },
      frequency: {
        type: Type.STRING,
        enum: ['WEEKLY', 'MONTHLY', 'PAYDAY', 'ONE_TIME'],
        description: 'Tekrar sıklığı',
      },
      reasoning: {
        type: Type.STRING,
        description: 'Neden abonelik olarak işaretlendiği',
      },
    },
    required: ['transaction_id', 'frequency', 'reasoning'],
  },
};

export const FLAG_REDUCIBLE_FUNCTION: FunctionDeclaration = {
  name: 'flag_reducible',
  description:
    'Azaltılabilir bir harcamayı işaretle ve tasarruf potansiyeli tutarını belirt. Ortalama tutardan yüksek kahve, sık yemek siparişi, kullanılmayan abonelik gibi.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      transaction_id: {
        type: Type.STRING,
        description: 'Transaction ID',
      },
      reducible_amount: {
        type: Type.NUMBER,
        description: "Bu transaction'dan kaç ₺ tasarruf edilebilir (0'dan büyük)",
      },
      reasoning: {
        type: Type.STRING,
        description: 'Neden azaltılabilir olduğu (1-2 cümle)',
      },
    },
    required: ['transaction_id', 'reducible_amount', 'reasoning'],
  },
};

export const RECOMMEND_MICRO_SAVING_FUNCTION: FunctionDeclaration = {
  name: 'recommend_micro_saving',
  description:
    'Genel bir mikro tasarruf önerisi ver. Kategori bazlı action item (ör. "Haftada 2 günü ev kahvesine çevir, ayda 600₺ tasarruf").',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        enum: [...SPENDING_CATEGORIES],
      },
      amount: {
        type: Type.NUMBER,
        description: 'Tasarruf tutarı (₺)',
      },
      period: {
        type: Type.STRING,
        enum: ['DAILY', 'WEEKLY', 'MONTHLY'],
      },
      reasoning: {
        type: Type.STRING,
        description: 'Aksiyon önerisi metni (kullanıcıya gösterilir, 1-2 cümle Türkçe)',
      },
    },
    required: ['category', 'amount', 'period', 'reasoning'],
  },
};

export const ALL_FUNCTIONS: FunctionDeclaration[] = [
  SET_CATEGORY_FUNCTION,
  MARK_SUBSCRIPTION_FUNCTION,
  FLAG_REDUCIBLE_FUNCTION,
  RECOMMEND_MICRO_SAVING_FUNCTION,
];
