import { type ReactElement, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ChevronDown, ChevronUp, Copy, LoaderCircle, Sparkles, WandSparkles, X } from 'lucide-react';
import type { Diagnostic, FixSuggestion, RuleCategory } from '../types';

interface DiagnosticListProps { diagnostics: Diagnostic[]; }
interface ActiveFixState { key: string; diagnostic: Diagnostic; suggestion: FixSuggestion | null; loading: boolean; error: string | null; }

const CATEGORY_LABELS: Record<RuleCategory, string> = {
  accessibility: 'Accessibility',
  'best-practices': 'Best Practices',
  bundle: 'Bundle Quality',
};

export function DiagnosticList({ diagnostics }: DiagnosticListProps): ReactElement {
  const [expanded, setExpanded] = useState<Record<RuleCategory, boolean>>({ accessibility: true, 'best-practices': true, bundle: true });
  const [activeFix, setActiveFix] = useState<ActiveFixState | null>(null);

  const grouped = useMemo(() => ({
    accessibility: diagnostics.filter((d) => d.category === 'accessibility'),
    'best-practices': diagnostics.filter((d) => d.category === 'best-practices'),
    bundle: diagnostics.filter((d) => d.category === 'bundle'),
  }), [diagnostics]);

  const fetchFix = async (diagnostic: Diagnostic): Promise<void> => {
    const key = `${diagnostic.filePath}:${diagnostic.line}:${diagnostic.rule}`;
    setActiveFix({ key, diagnostic, suggestion: null, loading: true, error: null });
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/fix`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ diagnostic, code: diagnostic.snippet ?? '' }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Fix generation failed');
      setActiveFix({ key, diagnostic, suggestion: payload.suggestion, loading: false, error: null });
    } catch (error) {
      setActiveFix({ key, diagnostic, suggestion: null, loading: false, error: error instanceof Error ? error.message : 'Unknown fix error' });
    }
  };

  return (
    <>
      <motion.section className="glass-card p-5" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.25 }}>
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Diagnostics</h2><span className="text-sm text-textSecondary">{diagnostics.length} total issues</span></div>
        <div className="space-y-3">
          {(Object.keys(CATEGORY_LABELS) as RuleCategory[]).map((category) => {
            const list = grouped[category];
            const isOpen = expanded[category];
            return (
              <div key={category} className="rounded-xl border border-border bg-surfaceAlt">
                <button type="button" onClick={() => setExpanded((prev) => ({ ...prev, [category]: !prev[category] }))} className="flex w-full items-center justify-between px-4 py-3 text-left">
                  <div><p className="font-medium text-text">{CATEGORY_LABELS[category]}</p><p className="text-xs text-textSecondary">{list.length} issues</p></div>
                  {isOpen ? <ChevronUp className="h-4 w-4 text-textSecondary" /> : <ChevronDown className="h-4 w-4 text-textSecondary" />}
                </button>
                <AnimatePresence initial={false}>{isOpen ? (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="overflow-hidden">
                    <div className="space-y-2 border-t border-border p-3">
                      {list.length === 0 ? <p className="rounded-lg border border-dashed border-border p-3 text-sm text-textSecondary">No issues in this category.</p> : list.map((diagnostic, index) => {
                        const key = `${diagnostic.filePath}:${diagnostic.line}:${diagnostic.rule}`;
                        return (
                          <motion.article key={key} className="rounded-lg border border-border bg-surface px-3 py-3" initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.15) }}>
                            <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className={diagnostic.severity === 'error' ? 'badge-error' : 'badge-warn'}>{diagnostic.severity}</span><code className="rounded bg-black/30 px-2 py-1 font-mono text-xs text-indigo-200">{diagnostic.rule}</code></div><button type="button" className="btn-outline" onClick={() => void fetchFix(diagnostic)}><WandSparkles className="h-3.5 w-3.5" />Get AI Fix</button></div>
                            <p className="mb-1 text-sm text-text">{diagnostic.message}</p>
                            <p className="font-mono text-xs text-textMuted">{diagnostic.filePath}:{diagnostic.line}</p>
                          </motion.article>
                        );
                      })}
                    </div>
                  </motion.div>
                ) : null}</AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.section>

      <AnimatePresence>{activeFix ? (
        <motion.aside className="fixed right-0 top-0 z-40 flex h-screen w-full max-w-2xl flex-col border-l border-border bg-[#0d0d0d] p-5 shadow-2xl" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: 0.28, ease: 'easeOut' }}>
          <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-indigo-300" /><h3 className="text-lg font-semibold">AI Suggestion</h3></div><button type="button" className="rounded-lg border border-border p-2 text-textSecondary hover:text-white" onClick={() => setActiveFix(null)}><X className="h-4 w-4" /></button></div>
          <p className="mb-3 text-xs text-textSecondary">{activeFix.diagnostic.rule} • {activeFix.diagnostic.filePath}:{activeFix.diagnostic.line}</p>
          {activeFix.loading ? <div className="space-y-3"><div className="h-4 w-40 animate-pulse rounded bg-border" /><div className="h-36 animate-pulse rounded-xl bg-surface" /><div className="h-36 animate-pulse rounded-xl bg-surface" /></div> : activeFix.error ? <div className="rounded-xl border border-danger/50 bg-danger/10 p-4 text-sm text-danger"><div className="mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Unable to generate fix</div><p>{activeFix.error}</p></div> : activeFix.suggestion ? <><div className="grid flex-1 grid-cols-1 gap-3 overflow-auto md:grid-cols-2"><div className="rounded-xl border border-danger/40 bg-danger/5 p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-danger">Before</p><pre className="max-h-[42vh] overflow-auto whitespace-pre-wrap font-mono text-xs text-red-100">{activeFix.diagnostic.snippet ?? 'No snippet available.'}</pre></div><div className="rounded-xl border border-success/40 bg-success/5 p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-success">After</p><pre className="max-h-[42vh] overflow-auto whitespace-pre-wrap font-mono text-xs text-emerald-100">{activeFix.suggestion.fixedCode}</pre></div></div><div className="mt-4 rounded-xl border border-border bg-surface p-3"><p className="mb-2 text-xs uppercase tracking-wide text-textSecondary">Explanation</p><p className="text-sm text-textSecondary">{activeFix.suggestion.explanation}</p></div><div className="mt-4 flex justify-end"><button type="button" className="btn-primary" onClick={() => void navigator.clipboard.writeText(activeFix.suggestion?.fixedCode ?? '')}><Copy className="h-4 w-4" />Copy Fix</button></div></> : <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-3 text-sm text-textSecondary"><LoaderCircle className="h-4 w-4 animate-spin" />Waiting for suggestion...</div>}
        </motion.aside>
      ) : null}</AnimatePresence>
    </>
  );
}
