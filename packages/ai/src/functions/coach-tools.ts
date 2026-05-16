/**
 * AI Saving Coach (Pattern B) — Tool definitions.
 * Gemini bunları çağırarak kullanıcının gerçek verisine ulaşır.
 */
import { Type, type FunctionDeclaration } from '@google/genai';
import { SPENDING_CATEGORIES } from '@niyet/core';

export const GET_DASHBOARD_SUMMARY_TOOL: FunctionDeclaration = {
  name: 'get_dashboard_summary',
  description:
    'Kullanıcının son 30 günlük dashboard özetini getir: toplam harcama, tasarruf fırsatı, ' +
    'aktif kural/hedef sayısı, kabul edilen mikro katkı toplamı.',
  parameters: { type: Type.OBJECT, properties: {}, required: [] },
};

export const GET_CATEGORY_BREAKDOWN_TOOL: FunctionDeclaration = {
  name: 'get_category_breakdown',
  description:
    'Kullanıcının son 30 günlük harcamalarını kategori bazında getir (en yüksekten düşüğe). ' +
    'Her kategoride toplam tutar, işlem sayısı, ortalama, ve azaltılabilir fırsat.',
  parameters: { type: Type.OBJECT, properties: {}, required: [] },
};

export const GET_SUBSCRIPTIONS_TOOL: FunctionDeclaration = {
  name: 'get_subscriptions',
  description:
    'Kullanıcının aboneliklerini getir (Netflix, Spotify vb). Her birinin aylık/yıllık ' +
    'maliyeti + durumu (ACTIVE/CANCELLABLE/CANCELED).',
  parameters: { type: Type.OBJECT, properties: {}, required: [] },
};

export const GET_GOALS_TOOL: FunctionDeclaration = {
  name: 'get_goals_with_eta',
  description:
    'Kullanıcının aktif hedeflerini ETA (kalan ay sayısı) ile getir. Her hedefin mevcut ' +
    'birikimi, hedef tutarı, aylık katkı oranı.',
  parameters: { type: Type.OBJECT, properties: {}, required: [] },
};

export const GET_CATEGORY_TRANSACTIONS_TOOL: FunctionDeclaration = {
  name: 'get_category_transactions',
  description:
    'Belirli bir kategorideki son işlemleri getir (en yüksek tutarlı 5 tanesi). ' +
    'Kullanıcı bir kategoride detay isterse çağır.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: {
        type: Type.STRING,
        enum: [...SPENDING_CATEGORIES],
      },
    },
    required: ['category'],
  },
};

export const RECOMMEND_ACTION_TOOL: FunctionDeclaration = {
  name: 'recommend_action',
  description:
    'Konuşmanın sonunda kullanıcıya bir aksiyon öner. UI bu öneriyi tıklanır bir kart ' +
    'olarak gösterir. Öneri 3 tipte olabilir: ACCEPT_CATEGORY (kategori fırsatını katkıya ' +
    'dönüştür), CANCEL_SUBSCRIPTION (aboneliği iptal et), CREATE_RULE (düzenli katkı kuralı).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      action_type: {
        type: Type.STRING,
        enum: ['ACCEPT_CATEGORY', 'CANCEL_SUBSCRIPTION', 'CREATE_RULE', 'OPEN_GOAL'],
      },
      label: {
        type: Type.STRING,
        description: 'UI butonunda görünecek kısa metin (örn: "Kahveden 432 ₺ aktar")',
      },
      target_ref: {
        type: Type.STRING,
        description:
          'ACCEPT_CATEGORY için kategori adı (COFFEE), CANCEL_SUBSCRIPTION için ' +
          'subscription_id, OPEN_GOAL için goal_id',
      },
      reasoning: {
        type: Type.STRING,
        description: 'Bu öneriyi neden yaptın (1 cümle Türkçe)',
      },
    },
    required: ['action_type', 'label', 'reasoning'],
  },
};

export const SIMULATE_GOAL_ACCELERATION_TOOL: FunctionDeclaration = {
  name: 'simulate_goal_acceleration',
  description:
    'Belirli bir hedef için "hangi kategoriyi ne kadar kesersem hedefe kaç ay erken ulaşırım" ' +
    'simülasyonu üret. Sonuç: top 3 kategori (en yüksek opportunity), birleşik senaryo (top 3 ' +
    'kategoriyi birlikte kesme) ve en kolay tek kategori senaryosu. Kategori kesme oranı pratik ' +
    'olarak %70 alınır. Kullanıcı goal context ile geldiyse (sohbete bir hedef üzerinden başladıysa) ' +
    "her zaman bu tool'u çağır — kategori-mapping yapmadan tasarruf önerisi verme.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      goal_id: {
        type: Type.STRING,
        description:
          "Simülasyonu yapılacak hedefin id'si. Kullanıcı goal sayfasından gelmişse coach " +
          "agent'a goalId iletilir; tool çağrısında o id kullanılmalı. Bilinmiyorsa önce " +
          '`get_goals_with_eta` ile listele.',
      },
    },
    required: ['goal_id'],
  },
};

export const COACH_TOOLS: FunctionDeclaration[] = [
  GET_DASHBOARD_SUMMARY_TOOL,
  GET_CATEGORY_BREAKDOWN_TOOL,
  GET_SUBSCRIPTIONS_TOOL,
  GET_GOALS_TOOL,
  GET_CATEGORY_TRANSACTIONS_TOOL,
  SIMULATE_GOAL_ACCELERATION_TOOL,
  RECOMMEND_ACTION_TOOL,
];
