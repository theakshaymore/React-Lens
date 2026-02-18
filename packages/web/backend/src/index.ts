import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { scanRouter } from './routes/scan.js';
import { shareRouter } from './routes/share.js';
import { fixRouter } from './routes/fix.js';

const app = express();
const port = Number(process.env.PORT ?? 8787);

app.use(cors({
  origin: [
    'http://localhost:5173',
    'react-lenss.vercel.app',
    /\.vercel\.app$/
  ]
}));
app.use(express.json({ limit: '2mb' }));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'react-lens-backend' }));
app.use('/api', scanRouter);
app.use('/api', shareRouter);
app.use('/api', fixRouter);
app.listen(port, () => console.log(`react-lens backend listening on http://localhost:${port}`));
