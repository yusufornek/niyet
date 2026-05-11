import { describe, expect, it } from 'vitest';
import { GeminiQueryRewriteAdapter } from '../src/index.js';

describe('GeminiQueryRewriteAdapter', () => {
  it('returns null when Gemini responds with invalid JSON', async () => {
    const adapter = new GeminiQueryRewriteAdapter({
      apiKey: 'test-key',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [{ text: 'iphone 15 almak istiyorum' }]
                }
              }
            ]
          }),
          { status: 200 }
        )
    });

    await expect(adapter.normalizeProductQuery('ayfon 15')).resolves.toBeNull();
  });
});
