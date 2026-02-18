import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { accessibilityRules } from './rules/accessibility.js';
import { bestPracticeRules } from './rules/best-practices.js';
import { bundleRules } from './rules/bundle.js';
import { computeScore } from './scorer.js';
import type { Diagnostic, RuleCategory, ScanOptions, ScanResult } from './types.js';

const RULES = [accessibilityRules, bestPracticeRules, bundleRules] as const;

export function normalizeCategory(category?: string): RuleCategory | undefined {
  if (!category) return undefined;
  const normalized = category.toLowerCase();
  if (['a11y', 'accessibility'].includes(normalized)) return 'accessibility';
  if (['best', 'best-practices', 'practices'].includes(normalized)) return 'best-practices';
  if (['bundle', 'performance'].includes(normalized)) return 'bundle';
  return undefined;
}

async function listFiles(targetPath: string): Promise<string[]> {
  const resolved = path.resolve(targetPath);
  const stat = await fs.stat(resolved);
  if (stat.isFile()) return ['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(resolved)) ? [resolved] : [];
  return fg(['**/*.{ts,tsx,js,jsx}'], { cwd: resolved, absolute: true, ignore: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/coverage/**'] });
}

export async function scanCodebase(options: ScanOptions): Promise<ScanResult> {
  const files = await listFiles(options.targetPath);
  const diagnostics: Diagnostic[] = [];
  const selectedRules = options.category ? RULES.filter((r) => r.category === options.category) : RULES;

  for (const file of files) {
    const content = await fs.readFile(file, 'utf8');
    for (const rule of selectedRules) {
      try {
        const found = rule.run({ filePath: file, content });
        diagnostics.push(...found.map((d) => ({ ...d, snippet: options.includeSnippets ? d.snippet : undefined })));
      } catch (error) {
        diagnostics.push({ category: 'best-practices', rule: 'parse-failure', severity: 'warn', filePath: file, line: 1, message: `Failed to analyze file for ${rule.category}: ${error instanceof Error ? error.message : 'unknown error'}`, snippet: options.includeSnippets ? content.split('\n').slice(0, 3).join('\n') : undefined });
      }
    }
  }

  diagnostics.sort((a, b) => (a.category !== b.category ? a.category.localeCompare(b.category) : a.filePath !== b.filePath ? a.filePath.localeCompare(b.filePath) : a.line - b.line));
  return computeScore(diagnostics);
}

export async function scanSnippet(code: string, filePath = 'snippet.tsx'): Promise<ScanResult> {
  const diagnostics: Diagnostic[] = [];
  for (const rule of RULES) {
    try {
      diagnostics.push(...rule.run({ filePath, content: code }));
    } catch (error) {
      diagnostics.push({ category: 'best-practices', rule: 'parse-failure', severity: 'warn', filePath, line: 1, message: `Failed to analyze snippet for ${rule.category}: ${error instanceof Error ? error.message : 'unknown error'}` });
    }
  }
  return computeScore(diagnostics);
}
