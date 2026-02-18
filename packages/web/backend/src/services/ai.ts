import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Diagnostic } from 'react-lens';

export interface FixSuggestion {
  explanation: string;
  fixedCode: string;
}

export interface GenerationUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface GenerationParams {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AiServiceError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
  }
}

const MODEL_CANDIDATES = [
  'gemini-1.5-flash-latest',
  'models/gemini-1.5-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-flash',
] as const;
const PRIMARY_MODEL = MODEL_CANDIDATES[0];

function normalizeUsage(raw: unknown): GenerationUsage {
  const usage = (raw ?? {}) as {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
  return {
    promptTokens: usage.promptTokenCount ?? 0,
    completionTokens: usage.candidatesTokenCount ?? 0,
    totalTokens: usage.totalTokenCount ?? 0,
  };
}

function mapProviderError(error: unknown): AiServiceError {
  const message = error instanceof Error ? error.message : 'Unknown Gemini API error';
  const lower = message.toLowerCase();

  if (lower.includes('api key') || lower.includes('permission denied') || lower.includes('unauthorized')) {
    return new AiServiceError('GOOGLE_API_KEY is invalid or unauthorized.', 401, 'INVALID_API_KEY');
  }
  if (lower.includes('quota') || lower.includes('resource_exhausted') || lower.includes('rate limit')) {
    return new AiServiceError('Gemini quota exceeded. Try again later or check usage limits.', 429, 'QUOTA_EXCEEDED');
  }
  if (lower.includes('safety')) {
    return new AiServiceError('Gemini blocked this request due to safety policies.', 400, 'SAFETY_BLOCKED');
  }

  return new AiServiceError(message, 502, 'UPSTREAM_ERROR');
}

function isModelNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes('not found') ||
    message.includes('404') ||
    message.includes('is not found for api version')
  );
}

export async function generateWithGemini(
  params: GenerationParams,
): Promise<{ text: string; usage: GenerationUsage; model: string }> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new AiServiceError('GOOGLE_API_KEY is not configured.', 500, 'MISSING_API_KEY');
  }

  try {
    const client = new GoogleGenerativeAI(apiKey);
    let lastError: unknown;
    for (const candidate of MODEL_CANDIDATES) {
      try {
        const model = client.getGenerativeModel({
          model: candidate,
          ...(params.systemPrompt ? { systemInstruction: params.systemPrompt } : {}),
        });

        const response = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: params.prompt }] }],
          generationConfig: {
            temperature: params.temperature ?? 0.1,
            maxOutputTokens: params.maxTokens ?? 1200,
          },
        });

        const text = response.response.text();
        if (!text) {
          throw new AiServiceError('Gemini returned an empty response.', 502, 'EMPTY_RESPONSE');
        }

        return { text, usage: normalizeUsage(response.response.usageMetadata), model: candidate };
      } catch (error) {
        if (isModelNotFoundError(error)) {
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw lastError ?? new Error('No compatible Gemini model found.');
  } catch (error) {
    if (error instanceof AiServiceError) throw error;
    throw mapProviderError(error);
  }
}

export async function getGeminiFix(
  diagnostic: Diagnostic,
  code: string,
  options?: Omit<GenerationParams, 'prompt'>,
): Promise<{ suggestion: FixSuggestion; usage: GenerationUsage; model: string }> {
  const prompt = [
    'You are fixing React/TypeScript code health issues.',
    `Rule: ${diagnostic.rule}`,
    `Category: ${diagnostic.category}`,
    `Severity: ${diagnostic.severity}`,
    `Diagnostic message: ${diagnostic.message}`,
    'Return strict JSON with keys: explanation, fixedCode.',
    'Code to fix:',
    code,
  ].join('\n');

  const { text, usage, model } = await generateWithGemini({
    prompt,
    systemPrompt: options?.systemPrompt,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });

  try {
    const parsed = JSON.parse(text) as FixSuggestion;
    if (!parsed.explanation || !parsed.fixedCode) throw new Error('Missing expected JSON keys.');
    return { suggestion: parsed, usage, model };
  } catch {
    return {
      suggestion: {
        explanation: 'Gemini response was not valid JSON. Returned as raw fixed code text.',
        fixedCode: text,
      },
      usage,
      model,
    };
  }
}

export function getAiStatus(): { ok: boolean; provider: string; model: string; configured: boolean } {
  return {
    ok: true,
    provider: 'google-gemini',
    model: PRIMARY_MODEL,
    configured: Boolean(process.env.GOOGLE_API_KEY),
  };
}
