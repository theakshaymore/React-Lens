export type RuleCategory = 'accessibility' | 'best-practices' | 'bundle';
export type Severity = 'error' | 'warn';

export interface Diagnostic {
  category: RuleCategory;
  rule: string;
  severity: Severity;
  filePath: string;
  line: number;
  message: string;
  snippet?: string;
}

export interface FileContext {
  filePath: string;
  content: string;
}

export interface RuleModule {
  category: RuleCategory;
  run: (context: FileContext) => Diagnostic[];
}

export interface ScanOptions {
  targetPath: string;
  category?: RuleCategory;
  includeSnippets?: boolean;
}

export interface ScoreBreakdown {
  accessibility: number;
  'best-practices': number;
  bundle: number;
}

export interface ScanResult {
  score: number;
  breakdown: ScoreBreakdown;
  diagnostics: Diagnostic[];
}
