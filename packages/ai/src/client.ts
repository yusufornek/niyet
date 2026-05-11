/**
 * Gemini client — Google Gen AI SDK.
 * Server-side only. API key boot time'da yoksa null döner; caller stub davranış uygular.
 */
import { GoogleGenAI } from '@google/genai';

let cached: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  if (cached) return cached;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your-gemini-api-key') return null;
  cached = new GoogleGenAI({ apiKey });
  return cached;
}

export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';
