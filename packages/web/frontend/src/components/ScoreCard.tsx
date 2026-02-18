import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { animate, motion } from 'framer-motion';
import { CheckCircle2, Package2, ShieldCheck } from 'lucide-react';
import type { ScanResult } from '../types';

interface ScoreCardProps { result: ScanResult; }
const CIRCLE_SIZE = 188;
const STROKE = 10;
const RADIUS = (CIRCLE_SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function ScoreCard({ result }: ScoreCardProps): ReactElement {
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    const controls = animate(0, result.score, { duration: 1, ease: 'easeOut', onUpdate: (v) => setDisplayScore(Math.round(v)) });
    return () => controls.stop();
  }, [result.score]);

  const strokeOffset = useMemo(() => {
    const ratio = Math.max(0, Math.min(100, displayScore)) / 100;
    return CIRCUMFERENCE - ratio * CIRCUMFERENCE;
  }, [displayScore]);

  const scoreTone = result.score > 80 ? 'text-success' : result.score >= 50 ? 'text-warning' : 'text-danger';
  const ringTone = result.score > 80 ? '#22c55e' : result.score >= 50 ? '#eab308' : '#ef4444';

  const categoryMeta = [
    { key: 'accessibility', name: 'Accessibility', icon: ShieldCheck, score: result.breakdown.accessibility, issues: result.diagnostics.filter((d) => d.category === 'accessibility').length },
    { key: 'best-practices', name: 'Best Practices', icon: CheckCircle2, score: result.breakdown['best-practices'], issues: result.diagnostics.filter((d) => d.category === 'best-practices').length },
    { key: 'bundle', name: 'Bundle Quality', icon: Package2, score: result.breakdown.bundle, issues: result.diagnostics.filter((d) => d.category === 'bundle').length },
  ];

  return (
    <motion.section className="glass-card p-6" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.15 }}>
      <div className="flex flex-col items-center gap-5">
        <h2 className="text-lg font-semibold">Overall Health Score</h2>
        <div className="relative grid place-items-center">
          <svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} className="-rotate-90">
            <circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS} fill="none" stroke="#232323" strokeWidth={STROKE} />
            <motion.circle cx={CIRCLE_SIZE / 2} cy={CIRCLE_SIZE / 2} r={RADIUS} fill="none" stroke={ringTone} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={CIRCUMFERENCE} animate={{ strokeDashoffset: strokeOffset }} transition={{ duration: 0.5, ease: 'easeOut' }} />
          </svg>
          <div className="absolute text-center"><p className={`text-5xl font-extrabold ${scoreTone}`}>{displayScore}</p><p className="text-xs uppercase tracking-[0.2em] text-textSecondary">out of 100</p></div>
        </div>

        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-3">
          {categoryMeta.map((category, index) => {
            const Icon = category.icon;
            return (
              <motion.article key={category.key} className="rounded-xl border border-border bg-surfaceAlt p-4 transition-colors hover:border-accent/70" whileHover={{ scale: 1.03 }} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + index * 0.08, duration: 0.25 }}>
                <div className="mb-2 flex items-center justify-between text-textSecondary"><Icon className="h-4 w-4" /><span className="text-xs">{category.issues} issues</span></div>
                <p className="text-sm text-textSecondary">{category.name}</p>
                <p className="text-xl font-semibold text-text">{category.score}/100</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
