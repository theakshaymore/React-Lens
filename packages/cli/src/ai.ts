import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRequire } from 'node:module';
import type { Diagnostic } from './types.js';

export interface AiSuggestion {
  explanation: string;
  fixedCode: string;
}

const require = createRequire(import.meta.url);
const sdkVersion = (require('@google/generative-ai/package.json') as { version?: string }).version ?? 'unknown';
console.log(`[ai] SDK version: ${sdkVersion}`);

const MODEL_CANDIDATES = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];

function isModelNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('not found') ||
    message.includes('404') ||
    message.includes('is not found for api version')
  );
}

function isAiSuggestion(value: unknown): value is AiSuggestion {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.explanation === 'string' && typeof candidate.fixedCode === 'string';
}

function parseSuggestion(text: string): AiSuggestion | null {
  const raw = text.trim();
  if (!raw) return null;

  const tryParse = (input: string): AiSuggestion | null => {
    try {
      const parsed = JSON.parse(input) as unknown;
      return isAiSuggestion(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(raw);
  if (direct) return direct;

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    const fencedParsed = tryParse(fencedMatch[1].trim());
    if (fencedParsed) return fencedParsed;
  }

  const firstBrace = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const sliced = tryParse(raw.slice(firstBrace, lastBrace + 1));
    if (sliced) return sliced;
  }

  return null;
}

function normalizeFixedCode(code: string): string {
  let out = code.trim();
  const fenced = out.match(/^```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```$/);
  if (fenced?.[1]) out = fenced[1].trim();
  if (out.toLowerCase().startsWith('json\n')) out = out.slice(5).trim();
  return out;
}

export async function getAiFixSuggestion(diagnostic: Diagnostic, apiKey: string): Promise<AiSuggestion | null> {
  if (!apiKey) return null;
  const gemini = new GoogleGenerativeAI(apiKey);
  const prompt = [
    'Return ONLY valid JSON (no markdown, no code fences, no extra text).',
    'JSON schema: {"explanation":"string","fixedCode":"string"}',
    'Important: fixedCode must be ONLY the corrected version of the provided snippet.',
    'Do not add wrappers, surrounding file content, or extra commentary.',
    'Preserve snippet boundaries and original behavior.',
    `Rule: ${diagnostic.rule}`,
    `Category: ${diagnostic.category}`,
    `Message: ${diagnostic.message}`,
    'Fix the code while preserving behavior.',
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

  const parsed = parseSuggestion(text);
  if (parsed) {
    return {
      explanation: parsed.explanation.trim(),
      fixedCode: normalizeFixedCode(parsed.fixedCode),
    };
  }
  return { explanation: 'Gemini returned a non-JSON answer. Parsed as raw text.', fixedCode: normalizeFixedCode(text) };
}
