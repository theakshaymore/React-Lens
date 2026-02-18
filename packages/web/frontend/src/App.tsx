import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, LoaderCircle, SearchCode, Sparkles } from 'lucide-react';
import { CodeInput } from './components/CodeInput';
import { DiagnosticList } from './components/DiagnosticList';
import { ScoreCard } from './components/ScoreCard';
import { ShareCard } from './components/ShareCard';
import type { ScanResult } from './types';

interface ScanPayload { code?: string; repoUrl?: string; share: boolean; }

export default function App(): ReactElement {
  const githubUrl = import.meta.env.VITE_GITHUB_URL ?? 'https://github.com/your-username/react-lens';
  const portfolioUrl = import.meta.env.VITE_PORTFOLIO_URL ?? 'https://your-portfolio.example.com';
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastPayload, setLastPayload] = useState<ScanPayload | null>(null);

  const fetchShare = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/share/${id}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to load share');
      setResult(payload.result);
      setShareId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load share');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    void fetchShare(id);
  }, [fetchShare]);

  const handleScan = async (payload: ScanPayload): Promise<void> => {
    setLoading(true);
    setError(null);
    setShareId(null);
    setLastPayload(payload);
    try {
      const response = await fetch('/api/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? 'Scan request failed');
      setResult(body.result);
      setShareId(body.shareId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected scan error');
    } finally {
      setLoading(false);
    }
  };

  const retry = async (): Promise<void> => {
    const sharedId = new URLSearchParams(window.location.search).get('id');
    if (sharedId) return fetchShare(sharedId);
    if (lastPayload) return handleScan(lastPayload);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <motion.header className="glass-card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}>
        <div><div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg border border-accent/40 bg-accent/20"><SearchCode className="h-4 w-4 text-indigo-200" /></div><h1 className="text-xl font-bold tracking-tight text-white">react-lens</h1></div><p className="mt-2 text-sm text-textSecondary">Diagnose your React codebase</p></div>
        <nav className="flex items-center gap-2 text-xs text-textSecondary"><span className="rounded-full border border-border bg-surfaceAlt px-3 py-1">CLI + Web</span><span className="rounded-full border border-border bg-surfaceAlt px-3 py-1">Gemini Fixes</span></nav>
      </motion.header>

      <CodeInput onScan={handleScan} loading={loading} />
      {error ? <motion.section className="glass-card border-danger/50 bg-danger/10 p-5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}><div className="mb-3 flex items-center gap-2 text-danger"><Sparkles className="h-4 w-4" /><h2 className="font-semibold">Something went wrong</h2></div><p className="text-sm text-red-200">{error}</p><button type="button" className="btn-primary mt-4" onClick={() => void retry()}>Retry</button></motion.section> : null}
      {loading && !result ? <motion.section className="glass-card flex items-center gap-3 p-5 text-indigo-200" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}><LoaderCircle className="h-5 w-5 animate-spin" />Scanning your codebase...</motion.section> : null}
      {!result && !loading && !error ? <motion.section className="glass-card grid place-items-center gap-3 border-dashed p-12 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}><div className="grid h-16 w-16 place-items-center rounded-2xl border border-border bg-surfaceAlt"><Eye className="h-8 w-8 text-textSecondary" /></div><h2 className="text-lg font-semibold">Run your first analysis</h2><p className="max-w-md text-sm text-textSecondary">Paste TSX code or add a GitHub repository URL to generate health diagnostics, category scores, and AI-powered fix suggestions.</p></motion.section> : null}
      {result ? <><ScoreCard result={result} /><ShareCard shareId={shareId} /><DiagnosticList diagnostics={result.diagnostics} /></> : null}

      <footer className="mt-2 flex flex-col items-center justify-between gap-3 rounded-xl border border-border bg-surfaceAlt/60 px-4 py-3 text-xs text-textSecondary sm:flex-row">
        <p>Built with react-lens</p>
        <div className="flex items-center gap-4">
          <a href={githubUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
            GitHub
          </a>
          <a href={portfolioUrl} target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
            Portfolio
          </a>
        </div>
      </footer>
    </div>
  );
}
