import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { getJsxElementName, getLine, sliceSnippet, walk } from '../ast-utils.js';
import { parseCode } from '../parse.js';
import type { Diagnostic, FileContext, RuleModule } from '../types.js';

function getIdentifierName(param: TSESTree.Parameter): string | undefined {
  if (param.type === 'Identifier') return param.name;
  return undefined;
}

function isLikelyComponent(fnName: string | undefined): boolean {
  return !!fnName && fnName[0] === fnName[0]?.toUpperCase();
}

export const bestPracticeRules: RuleModule = {
  category: 'best-practices',
  run: (context: FileContext): Diagnostic[] => {
    const ast = parseCode(context.content);
    const diagnostics: Diagnostic[] = [];

    walk(ast, (node) => {
      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' && node.callee.object.name === 'console' && node.callee.property.type === 'Identifier' && node.callee.property.name === 'log') {
        diagnostics.push({ category: 'best-practices', rule: 'no-console-log', severity: 'warn', filePath: context.filePath, line: getLine(node), message: 'Remove console.log statements from production code.', snippet: sliceSnippet(context.content, getLine(node)) });
      }

      if (node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && node.callee.object.type === 'Identifier' && node.callee.object.name === 'document' && node.callee.property.type === 'Identifier' && ['getElementById', 'querySelector'].includes(node.callee.property.name)) {
        diagnostics.push({ category: 'best-practices', rule: 'no-direct-dom-manipulation', severity: 'warn', filePath: context.filePath, line: getLine(node), message: 'Avoid direct DOM manipulation in React components.', snippet: sliceSnippet(context.content, getLine(node)) });
      }

      if (node.type === 'FunctionDeclaration' && isLikelyComponent(node.id?.name) && node.loc?.start.line !== undefined && node.loc?.end.line !== undefined) {
        const lineSpan = node.loc.end.line - node.loc.start.line + 1;
        if (lineSpan > 200) diagnostics.push({ category: 'best-practices', rule: 'no-large-component', severity: 'warn', filePath: context.filePath, line: getLine(node), message: `Component ${node.id?.name} has ${lineSpan} lines; split large components.`, snippet: sliceSnippet(context.content, getLine(node)) });
      }

      if (node.type === 'VariableDeclarator' && node.id.type === 'Identifier' && node.init && (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression') && isLikelyComponent(node.id.name)) {
        const fn = node.init;
        if (fn.loc?.start.line !== undefined && fn.loc?.end.line !== undefined) {
          const lineSpan = fn.loc.end.line - fn.loc.start.line + 1;
          if (lineSpan > 200) diagnostics.push({ category: 'best-practices', rule: 'no-large-component', severity: 'warn', filePath: context.filePath, line: getLine(fn), message: `Component ${node.id.name} has ${lineSpan} lines; split large components.`, snippet: sliceSnippet(context.content, getLine(fn)) });
        }
      }
    });

    let passThroughCount = 0;
    walk(ast, (node) => {
      if (node.type === 'FunctionDeclaration' && isLikelyComponent(node.id?.name) && node.params.length > 0) {
        const firstParam = node.params[0];
        if (!firstParam) return;
        const propParam = getIdentifierName(firstParam);
        if (!propParam) return;
        walk(node.body, (child) => {
          if (child.type === 'JSXAttribute' && child.value?.type === 'JSXExpressionContainer') {
            const expr = child.value.expression;
            if (expr.type === 'Identifier' && expr.name === propParam) passThroughCount += 1;
          }
        });
      }
      if (node.type === 'JSXSpreadAttribute' && node.argument.type === 'Identifier' && node.argument.name === 'props') passThroughCount += 1;
      if (node.type === 'JSXElement') {
        const name = getJsxElementName(node.openingElement.name);
        if (name[0] === name[0]?.toUpperCase()) {
          const forwardedProps = node.openingElement.attributes.filter((attr) => attr.type === 'JSXAttribute' && attr.value?.type === 'JSXExpressionContainer' && attr.value.expression.type === 'Identifier');
          if (forwardedProps.length > 1) passThroughCount += 1;
        }
      }
    });

    if (passThroughCount >= 3) diagnostics.push({ category: 'best-practices', rule: 'no-props-drilling', severity: 'warn', filePath: context.filePath, line: 1, message: 'Props appear to be forwarded deeply across multiple component boundaries.', snippet: sliceSnippet(context.content, 1) });

    return diagnostics;
  },
};
