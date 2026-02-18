import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Diagnostic } from './types.js';

export interface AiSuggestion {
  explanation: string;
  fixedCode: string;
}

const MODEL_CANDIDATES = [
  'gemini-1.5-flash-latest',
  'models/gemini-1.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
] as const;

function isModelNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('not found') ||
    message.includes('404') ||
    message.includes('is not found for api version')
  );
}

export async function getAiFixSuggestion(diagnostic: Diagnostic, apiKey: string): Promise<AiSuggestion | null> {
  if (!apiKey) return null;
  const gemini = new GoogleGenerativeAI(apiKey);
  const prompt = [
    `Rule: ${diagnostic.rule}`,
    `Category: ${diagnostic.category}`,
    `Message: ${diagnostic.message}`,
    'Fix the code while preserving behavior. Return JSON with keys: explanation, fixedCode.',
    'Code:',
    diagnostic.snippet ?? 'Snippet unavailable. Provide a generic fix pattern.',
  ].join('\n');

  let text: string | null = null;
  let lastError: unknown;
  for (const candidate of MODEL_CANDIDATES) {
    try {
      const model = gemini.getGenerativeModel({ model: candidate });
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 900,
        },
      });
      text = response.response.text();
      break;
    } catch (error) {
      if (isModelNotFoundError(error)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  if (!text) {
    if (lastError instanceof Error) throw lastError;
    return null;
  }

  try {
    const parsed = JSON.parse(text) as AiSuggestion;
    if (typeof parsed.explanation === 'string' && typeof parsed.fixedCode === 'string') return parsed;
  } catch {
    return { explanation: 'Gemini returned a non-JSON answer. Parsed as raw text.', fixedCode: text };
  }
  return null;
}
