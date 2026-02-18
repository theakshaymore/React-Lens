import { Router } from 'express';
import { getShare } from '../store/share-store.js';

export const shareRouter: Router = Router();

shareRouter.get('/share/:id', (req, res) => {
  const shared = getShare(req.params.id);
  if (!shared) return res.status(404).json({ error: 'Share result not found' });
  return res.json({ id: req.params.id, ...shared });
});
