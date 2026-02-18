#!/usr/bin/env node
import { Command } from 'commander';
import ora from 'ora';
import { getAiFixSuggestion } from './ai.js';
import { renderFullReport, renderScoreOnly } from './reporter.js';
import { normalizeCategory, scanCodebase } from './scanner.js';

const program = new Command();

program
  .name('react-lens')
  .description('React codebase health analyzer')
  .argument('[target]', 'target directory or file', '.')
  .option('-v, --verbose', 'show file and line for diagnostics', false)
  .option('-c, --category <category>', 'scan one category: a11y | best-practices | bundle')
  .option('--fix', 'fetch AI fix suggestions using Google Gemini API', false)
  .option('--score', 'print only score', false)
  .action(async (target: string, options) => {
    const category = normalizeCategory(options.category);
    if (options.category && !category) {
      console.error(`Invalid category: ${options.category}`);
      process.exit(1);
    }

    const spinner = options.score ? null : ora('Scanning project...').start();
    try {
      const result = await scanCodebase({ targetPath: target, category, includeSnippets: Boolean(options.fix) });
      if (spinner) spinner.succeed('Scan complete');
      if (options.score) renderScoreOnly(result);
      else renderFullReport(result, options.verbose, process.cwd());

      if (options.fix && result.diagnostics.length > 0) {
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) return void console.error('\nGOOGLE_API_KEY not set. Skipping AI suggestions.');
        console.log('\nAI Suggestions');
        for (const diagnostic of result.diagnostics.slice(0, 10)) {
          const suggestion = await getAiFixSuggestion(diagnostic, apiKey);
          if (!suggestion) continue;
          console.log(`\n${diagnostic.rule} (${diagnostic.filePath}:${diagnostic.line})`);
          console.log(`Explanation: ${suggestion.explanation}`);
          console.log(`Fixed code:\n${suggestion.fixedCode}`);
        }
      }
    } catch (error) {
      if (spinner) spinner.fail('Scan failed');
      console.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
