import type { ProductQueryNormalization } from '@niyet/core';
import { cleanRawQuery } from '@niyet/core';
import { z } from 'zod';

const DEFAULT_LLM_MODEL = 'gemini-2.5-flash';
const GOOGLE_GENERATE_CONTENT_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const LlmNormalizationSchema = z.object({
  normalizedQuery: z.string().min(1).max(120),
  category: z.string().min(1).max(60).nullable().default(null),
  confidence: z.number().min(0).max(1),
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

export interface QueryRewriteAdapterOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export interface ProductQueryRewriteAdapter {
  normalizeProductQuery(rawQuery: string): Promise<ProductQueryNormalization | null>;
}

export class GeminiQueryRewriteAdapter implements ProductQueryRewriteAdapter {
  private readonly apiKey: string | undefined;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: QueryRewriteAdapterOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    this.model = options.model ?? process.env.GEMINI_MODEL ?? DEFAULT_LLM_MODEL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async normalizeProductQuery(rawQuery: string): Promise<ProductQueryNormalization | null> {
    // No API key → caller must fall back to regex normalizer (packages/core).
    // Intentionally silent: this is a configuration state, not an error.
    if (!this.apiKey) {
      return null;
    }

    try {
      const response = await this.fetchImpl(this.endpointUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: this.prompt(rawQuery) }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        }),
      });

      if (!response.ok) {
        console.warn('[ai.query-normalizer] gemini_http_error', {
          status: response.status,
          statusText: response.statusText,
          rawQueryLength: rawQuery.length,
        });
        return null;
      }

      const payload = (await response.json()) as GeminiGenerateContentResponse;
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? '')
        .join('')
        .trim();

      if (!text) {
        console.warn('[ai.query-normalizer] gemini_empty_response', {
          candidateCount: payload.candidates?.length ?? 0,
          rawQueryLength: rawQuery.length,
        });
        return null;
      }

      const parsedJson = safeJsonParse(text);
      if (parsedJson === null) {
        console.warn('[ai.query-normalizer] gemini_invalid_json', {
          textLength: text.length,
          textPreview: text.slice(0, 80),
        });
        return null;
      }

      const parsed = LlmNormalizationSchema.safeParse(parsedJson);

      if (!parsed.success) {
        console.warn('[ai.query-normalizer] gemini_schema_mismatch', {
          issues: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.'),
            code: issue.code,
            message: issue.message,
          })),
        });
        return null;
      }

      return {
        rawQuery,
        normalizedQuery: cleanRawQuery(parsed.data.normalizedQuery),
        category: parsed.data.category,
        confidence: parsed.data.confidence,
        source: 'llm',
      };
    } catch (error) {
      console.warn('[ai.query-normalizer] gemini_call_failed', {
        error:
          error instanceof Error ? { name: error.name, message: error.message } : String(error),
        rawQueryLength: rawQuery.length,
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

  private prompt(rawQuery: string): string {
    return [
      'You normalize Turkish product search queries for a savings goal backend.',
      'Rules:',
      '- Only rewrite the product search query.',
      '- Do not invent a price.',
      '- Do not recommend products.',
      '- Do not provide financial advice.',
      '- Remove intent phrases such as "almak istiyorum" or "biriktiriyorum".',
      '- Fix obvious typos and keep brand/model terms.',
      '- Return only JSON with normalizedQuery, category, confidence.',
      `Raw query: ${JSON.stringify(rawQuery)}`,
    ].join('\n');
  }
}

// Returns null on invalid JSON. Caller is expected to log the failure with
// surrounding context (text preview, length, etc.) — see gemini_invalid_json.
function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(stripJsonFence(value));
  } catch {
    return null;
  }
}

function stripJsonFence(value: string): string {
  return value
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}
