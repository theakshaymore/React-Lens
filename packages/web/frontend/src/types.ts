export type RuleCategory = 'accessibility' | 'best-practices' | 'bundle';

export interface Diagnostic {
  category: RuleCategory;
  rule: string;
  severity: 'error' | 'warn';
  filePath: string;
  line: number;
  message: string;
  snippet?: string;
}

export interface ScanResult {
  score: number;
  breakdown: {
    accessibility: number;
    'best-practices': number;
    bundle: number;
  };
  diagnostics: Diagnostic[];
}

export interface FixSuggestion {
  explanation: string;
  fixedCode: string;
}
