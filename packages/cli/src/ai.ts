import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Diagnostic } from './types.js';

export interface AiSuggestion {
  explanation: string;
  fixedCode: string;
}

export async function getAiFixSuggestion(diagnostic: Diagnostic, apiKey: string): Promise<AiSuggestion | null> {
  if (!apiKey) return null;
  const gemini = new GoogleGenerativeAI(apiKey);
  const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = [
    `Rule: ${diagnostic.rule}`,
    `Category: ${diagnostic.category}`,
    `Message: ${diagnostic.message}`,
    'Fix the code while preserving behavior. Return JSON with keys: explanation, fixedCode.',
    'Code:',
    diagnostic.snippet ?? 'Snippet unavailable. Provide a generic fix pattern.',
  ].join('\n');

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 900,
    },
  });

  const text = response.response.text();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as AiSuggestion;
    if (typeof parsed.explanation === 'string' && typeof parsed.fixedCode === 'string') return parsed;
  } catch {
    return { explanation: 'Gemini returned a non-JSON answer. Parsed as raw text.', fixedCode: text };
  }
  return null;
}
