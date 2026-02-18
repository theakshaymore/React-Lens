import path from 'node:path';
import chalk from 'chalk';
import type { Diagnostic, ScanResult } from './types.js';

function colorizeScore(score: number): string {
  if (score > 80) return chalk.greenBright(`${score}`);
  if (score >= 50) return chalk.yellowBright(`${score}`);
  return chalk.redBright(`${score}`);
}

function groupByCategory(diagnostics: Diagnostic[]): Record<string, Diagnostic[]> {
  return diagnostics.reduce<Record<string, Diagnostic[]>>((acc, d) => {
    const list = acc[d.category] ?? [];
    list.push(d);
    acc[d.category] = list;
    return acc;
  }, {});
}

export function renderScoreOnly(result: ScanResult): void {
  console.log(`${result.score}`);
}

export function renderFullReport(result: ScanResult, verbose = false, cwd = process.cwd()): void {
  console.log(chalk.bold('React Lens Health Report'));
  console.log(`Score: ${colorizeScore(result.score)}/100`);
  console.log(`Breakdown: a11y ${result.breakdown.accessibility}/100 | best-practices ${result.breakdown['best-practices']}/100 | bundle ${result.breakdown.bundle}/100`);
  if (result.diagnostics.length === 0) return void console.log(chalk.green('No diagnostics found.'));

  const grouped = groupByCategory(result.diagnostics);
  for (const [category, entries] of Object.entries(grouped)) {
    console.log(`\n${chalk.bold(category)}`);
    for (const d of entries) {
      const severity = d.severity === 'error' ? chalk.red('error') : chalk.yellow('warn');
      const fileDisplay = path.relative(cwd, d.filePath) || d.filePath;
      const location = verbose ? ` (${fileDisplay}:${d.line})` : '';
      console.log(`- ${severity} ${chalk.cyan(d.rule)}${location}: ${d.message}`);
    }
  }
}
