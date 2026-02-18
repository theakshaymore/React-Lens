import { getLine, sliceSnippet, walk } from '../ast-utils.js';
import { parseCode } from '../parse.js';
import type { Diagnostic, FileContext, RuleModule } from '../types.js';

const FULL_IMPORT_LIBS = new Set(['lodash', 'moment', 'ramda']);

export const bundleRules: RuleModule = {
  category: 'bundle',
  run: (context: FileContext): Diagnostic[] => {
    const ast = parseCode(context.content);
    const diagnostics: Diagnostic[] = [];
    const importedLocals = new Map<string, { line: number }>();
    const usedIdentifiers = new Set<string>();
    const stringLiteralCounts = new Map<string, { count: number; line: number }>();

    walk(ast, (node) => {
      if (node.type === 'ImportDeclaration') {
        const sourceValue = node.source.value;
        if (typeof sourceValue === 'string' && FULL_IMPORT_LIBS.has(sourceValue)) {
          const hasNamespace = node.specifiers.some((s) => s.type === 'ImportNamespaceSpecifier');
          const hasDefaultOnly = node.specifiers.length > 0 && node.specifiers.every((s) => s.type === 'ImportDefaultSpecifier');
          if (hasNamespace || hasDefaultOnly) diagnostics.push({ category: 'bundle', rule: 'no-full-library-import', severity: 'warn', filePath: context.filePath, line: getLine(node), message: `Avoid full import from '${sourceValue}'. Prefer named or path imports.`, snippet: sliceSnippet(context.content, getLine(node)) });
        }
        for (const spec of node.specifiers) importedLocals.set(spec.local.name, { line: getLine(spec) });
      }
      if (node.type === 'Identifier') usedIdentifiers.add(node.name);
      if (node.type === 'Literal' && typeof node.value === 'string') {
        const text = node.value.trim();
        if (text.length > 0 && text.length <= 80) {
          const current = stringLiteralCounts.get(text);
          if (!current) stringLiteralCounts.set(text, { count: 1, line: getLine(node) });
          else current.count += 1;
        }
      }
    });

    for (const [local, meta] of importedLocals) {
      let seenCount = 0;
      walk(ast, (node) => {
        if (node.type === 'Identifier' && node.name === local) seenCount += 1;
      });
      if (seenCount <= 1 && !usedIdentifiers.has(`__used_${local}`)) diagnostics.push({ category: 'bundle', rule: 'no-unused-imports', severity: 'warn', filePath: context.filePath, line: meta.line, message: `Imported symbol '${local}' appears unused.`, snippet: sliceSnippet(context.content, meta.line) });
    }

    for (const [text, meta] of stringLiteralCounts) {
      if (meta.count >= 3) diagnostics.push({ category: 'bundle', rule: 'no-hardcoded-strings', severity: 'warn', filePath: context.filePath, line: meta.line, message: `String literal '${text}' repeated ${meta.count} times; extract to a constant.`, snippet: sliceSnippet(context.content, meta.line) });
    }

    return diagnostics;
  },
};
