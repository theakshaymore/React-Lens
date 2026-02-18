import { GoogleGenerativeAI } from '@google/generative-ai';
import { createRequire } from 'node:module';
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

const require = createRequire(import.meta.url);
const sdkVersion = (require('@google/generative-ai/package.json') as { version?: string }).version ?? 'unknown';
console.log(`[ai] SDK version: ${sdkVersion}`);

const MODEL_CANDIDATES = ['models/gemini-1.5-flash', 'models/gemini-1.5-pro', 'models/gemini-pro'];
const PRIMARY_MODEL = MODEL_CANDIDATES[0] ?? 'models/gemini-pro';

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

interface ListModelsResponse {
  models?: Array<{
    name?: string;
    supportedGenerationMethods?: string[];
  }>;
}

function isFixSuggestion(value: unknown): value is FixSuggestion {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.explanation === 'string' && typeof candidate.fixedCode === 'string';
}

function parseFixSuggestionFromText(text: string): FixSuggestion | null {
  const raw = text.trim();
  if (!raw) return null;

  const tryParse = (input: string): FixSuggestion | null => {
    try {
      const parsed = JSON.parse(input) as unknown;
      return isFixSuggestion(parsed) ? parsed : null;
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
    const objectSlice = raw.slice(firstBrace, lastBrace + 1);
    const slicedParsed = tryParse(objectSlice);
    if (slicedParsed) return slicedParsed;
  }

  return null;
}

function normalizeFixedCode(code: string): string {
  let out = code.trim();

  const fenced = out.match(/^```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```$/);
  if (fenced?.[1]) {
    out = fenced[1].trim();
  }

  if (out.toLowerCase().startsWith('json\n')) {
    out = out.slice(5).trim();
  }

  return out;
}

async function getAvailableGenerateModels(apiKey: string): Promise<string[]> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
    );
    if (!response.ok) return [];
    const data = (await response.json()) as ListModelsResponse;
    const models = data.models ?? [];
    return models
      .filter((model) => (model.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((model) => model.name ?? '')
      .filter((name) => name.startsWith('models/'));
  } catch {
    return [];
  }
}

async function runSimpleGeminiDebugCall(apiKey: string): Promise<void> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    console.log('[ai] Simple test model: gemini-pro');
    const result = await model.generateContent('test');
    console.log('[ai] Simple test response:', result.response.text());
  } catch (error) {
    console.error('[ai] Simple test call failed:', error instanceof Error ? error.message : String(error));
  }
}

export async function generateWithGemini(
  params: GenerationParams,
): Promise<{ text: string; usage: GenerationUsage; model: string }> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new AiServiceError('GOOGLE_API_KEY is not configured.', 500, 'MISSING_API_KEY');
  }

  try {
    console.log('[ai] API Key:', apiKey.slice(0, 10));
    console.log('[ai] SDK version:', sdkVersion);
    await runSimpleGeminiDebugCall(apiKey);

    const client = new GoogleGenerativeAI(apiKey);
    const available = await getAvailableGenerateModels(apiKey);
    console.log('[ai] Models from ListModels (generateContent):', available);
    const preferred = MODEL_CANDIDATES.filter((model) => available.includes(model));
    const dynamicFallback = available.filter((model) => !preferred.includes(model));
    const tryModels = [...preferred, ...MODEL_CANDIDATES.filter((m) => !preferred.includes(m)), ...dynamicFallback];

    let lastError: unknown;
    for (const candidate of tryModels) {
      try {
        console.log('[ai] Model:', candidate);
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

        console.log(`[ai] Using Gemini model: ${candidate}`);
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
  const prompt = `You are a code fix assistant. You MUST respond with ONLY valid JSON, nothing else.

REQUIRED JSON FORMAT (no markdown, no explanations outside JSON):
{
  "explanation": "brief description of the fix",
  "fixedCode": "the corrected code here"
}

CRITICAL RULES:
- Response must be ONLY the JSON object above
- No markdown code fences like \`\`\`json
- No preamble or postamble text
- fixedCode must contain ONLY the corrected code snippet
- Do not wrap code in additional markup

DIAGNOSTIC:
Rule: ${diagnostic.rule}
Category: ${diagnostic.category}
Severity: ${diagnostic.severity}
Message: ${diagnostic.message}

CODE TO FIX:
${code}

Remember: Respond with ONLY the JSON object, nothing else.`;

  const { text, usage, model } = await generateWithGemini({
    prompt,
    systemPrompt: options?.systemPrompt,
    temperature: options?.temperature,
    maxTokens: options?.maxTokens,
  });

  const parsed = parseFixSuggestionFromText(text);
  if (parsed) {
    return {
      suggestion: {
        explanation: parsed.explanation.trim(),
        fixedCode: normalizeFixedCode(parsed.fixedCode),
      },
      usage,
      model,
    };
  }

  {
    return {
      suggestion: {
        explanation:
          'Gemini response could not be parsed as expected JSON. Returned as raw fixed code text.',
        fixedCode: normalizeFixedCode(text),
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
