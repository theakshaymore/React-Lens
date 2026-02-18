import { Router } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { scanInput } from '../services/scanner.js';
import { saveShare } from '../store/share-store.js';

const scanSchema = z.object({ code: z.string().optional(), repoUrl: z.string().url().optional(), share: z.boolean().optional().default(false) });
export const scanRouter: Router = Router();

scanRouter.post('/scan', async (req, res) => {
  const parsed = scanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
  try {
    const result = await scanInput({ code: parsed.data.code, repoUrl: parsed.data.repoUrl });
    let shareId: string | null = null;
    if (parsed.data.share) {
      shareId = nanoid(8);
      saveShare(shareId, result);
    }
    return res.json({ result, shareId });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown scan error' });
  }
});
