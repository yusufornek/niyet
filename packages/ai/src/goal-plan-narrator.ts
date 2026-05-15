import type { GoalSavingsPlan } from '@niyet/core';
import { z } from 'zod';

const DEFAULT_LLM_MODEL = 'gemini-2.5-flash';
const GOOGLE_GENERATE_CONTENT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const GoalPlanNarrationSchema = z.object({
  summary: z.string().min(20).max(280),
});

interface GeminiPart {
  text?: string;
}

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
}

export interface GoalPlanNarrationInput {
  goalName: string;
  targetPrice: number;
  monthlyIncome: number;
  last30dOpportunity: number;
  acceptedContributionsLast30d: number;
  plan: GoalSavingsPlan;
}

export interface GoalPlanNarrator {
  summarizeGoalPlan(input: GoalPlanNarrationInput): Promise<string | null>;
}

export interface GeminiGoalPlanNarratorOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export class GeminiGoalPlanNarrator implements GoalPlanNarrator {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeminiGoalPlanNarratorOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    this.model = options.model ?? process.env.GEMINI_MODEL ?? DEFAULT_LLM_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async summarizeGoalPlan(input: GoalPlanNarrationInput): Promise<string | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await this.fetchImpl(this.endpointUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: this.prompt(input) }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.3,
          },
        }),
      });

      if (!response.ok) {
        console.warn('[ai.goal-plan] gemini_http_error', {
          status: response.status,
          statusText: response.statusText,
        });
        return null;
      }

      const payload = (await response.json()) as GeminiGenerateContentResponse;
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim();
      if (!text) {
        return null;
      }

      const parsedJson = safeJsonParse(text);
      const parsed = GoalPlanNarrationSchema.safeParse(parsedJson);
      return parsed.success ? parsed.data.summary : null;
    } catch (error) {
      console.warn('[ai.goal-plan] gemini_call_failed', {
        error:
          error instanceof Error ? { name: error.name, message: error.message } : String(error),
      });
      return null;
    }
  }

  private endpointUrl(): string {
    const encodedModel = encodeURIComponent(this.model);
    return `${GOOGLE_GENERATE_CONTENT_BASE_URL}/${encodedModel}:generateContent?key=${encodeURIComponent(
      this.apiKey ?? '',
    )}`;
  }

  private prompt(input: GoalPlanNarrationInput): string {
    return [
      'Niyet icin Turkce bir tasarruf hedefi plan ozeti yaz.',
      'Kurallar:',
      '- Finansal yatirim tavsiyesi verme.',
      '- Hesaplari degistirme, sadece verilen plana dayan.',
      '- Tek cumle veya iki kisa cumle yaz.',
      '- Kullaniciyi hedefe yonlendiren pratik ve net bir dil kullan.',
      '- Sadece JSON don: {"summary":"..."}',
      `Goal: ${JSON.stringify({
        name: input.goalName,
        targetPrice: input.targetPrice,
        monthlyIncome: input.monthlyIncome,
        last30dOpportunity: input.last30dOpportunity,
        acceptedContributionsLast30d: input.acceptedContributionsLast30d,
        plan: input.plan,
      })}`,
    ].join('\n');
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}
