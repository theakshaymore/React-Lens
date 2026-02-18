import { Router } from 'express';
import { z } from 'zod';
import type { Diagnostic } from 'react-lens';
import { AiServiceError, generateWithGemini, getAiStatus, getGeminiFix } from '../services/ai.js';

const diagnosticSchema: z.ZodType<Diagnostic> = z.object({ category: z.enum(['accessibility', 'best-practices', 'bundle']), rule: z.string(), severity: z.enum(['error', 'warn']), filePath: z.string(), line: z.number(), message: z.string(), snippet: z.string().optional() });
const aiParamsSchema = z.object({
  systemPrompt: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(8192).optional(),
});

const fixFromDiagnosticSchema = z.object({
  diagnostic: diagnosticSchema,
  code: z.string().min(1),
}).merge(aiParamsSchema);

const fixFromPromptSchema = z.object({
  prompt: z.string().min(1),
}).merge(aiParamsSchema);

const fixSchema = z.union([fixFromDiagnosticSchema, fixFromPromptSchema]);
export const fixRouter: Router = Router();

fixRouter.get('/fix', (_req, res) => {
  return res.json(getAiStatus());
});

fixRouter.get('/fix/status', (_req, res) => {
  return res.json(getAiStatus());
});

fixRouter.post('/fix', async (req, res) => {
  const parsed = fixSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  try {
    if ('diagnostic' in parsed.data) {
      const output = await getGeminiFix(parsed.data.diagnostic, parsed.data.code, {
        systemPrompt: parsed.data.systemPrompt,
        temperature: parsed.data.temperature,
        maxTokens: parsed.data.maxTokens,
      });
      return res.json(output);
    }

    const output = await generateWithGemini({
      prompt: parsed.data.prompt,
      systemPrompt: parsed.data.systemPrompt,
      temperature: parsed.data.temperature,
      maxTokens: parsed.data.maxTokens,
    });

    return res.json({
      suggestion: {
        explanation: 'Generated from prompt.',
        fixedCode: output.text,
      },
      usage: output.usage,
      model: output.model,
    });
  } catch (error) {
    if (error instanceof AiServiceError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown AI error', code: 'UNKNOWN_AI_ERROR' });
  }
});
