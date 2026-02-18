import type { Diagnostic, RuleCategory, ScanResult, ScoreBreakdown } from './types.js';

const ERROR_PENALTY = 3;
const WARN_PENALTY = 1;
const CATEGORY_BASE = 100;

function categoryPenalty(diagnostics: Diagnostic[], category: RuleCategory): number {
  return diagnostics.filter((d) => d.category === category).reduce((sum, d) => sum + (d.severity === 'error' ? ERROR_PENALTY : WARN_PENALTY), 0);
}

export function computeScore(diagnostics: Diagnostic[]): ScanResult {
  const totalPenalty = diagnostics.reduce((sum, d) => sum + (d.severity === 'error' ? ERROR_PENALTY : WARN_PENALTY), 0);
  const score = Math.max(0, 100 - totalPenalty);

  const breakdown: ScoreBreakdown = {
    accessibility: Math.max(0, CATEGORY_BASE - categoryPenalty(diagnostics, 'accessibility')),
    'best-practices': Math.max(0, CATEGORY_BASE - categoryPenalty(diagnostics, 'best-practices')),
    bundle: Math.max(0, CATEGORY_BASE - categoryPenalty(diagnostics, 'bundle')),
  };

  return { score, breakdown, diagnostics };
}
