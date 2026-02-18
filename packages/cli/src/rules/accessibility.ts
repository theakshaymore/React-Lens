import type { TSESTree } from '@typescript-eslint/typescript-estree';
import { getJsxAttribute, getJsxElementName, getLine, sliceSnippet, walk } from '../ast-utils.js';
import { parseCode } from '../parse.js';
import type { Diagnostic, FileContext, RuleModule } from '../types.js';

function isInteractiveHandlerName(name: string): boolean {
  return name.startsWith('onClick') || name.startsWith('onKey') || name.startsWith('onMouse');
}

function hasTextContent(el: TSESTree.JSXElement): boolean {
  return el.children.some((child) => {
    if (child.type === 'JSXText') return child.value.trim().length > 0;
    if (child.type === 'JSXExpressionContainer' && child.expression.type === 'Literal') {
      return String(child.expression.value ?? '').trim().length > 0;
    }
    return false;
  });
}

export const accessibilityRules: RuleModule = {
  category: 'accessibility',
  run: (context: FileContext): Diagnostic[] => {
    const ast = parseCode(context.content);
    const diagnostics: Diagnostic[] = [];

    walk(ast, (node) => {
      if (node.type !== 'JSXElement') return;
      const opening = node.openingElement;
      const tag = getJsxElementName(opening.name);
      const attrs = opening.attributes;

      if (tag === 'img' && !getJsxAttribute(attrs, 'alt')) {
        diagnostics.push({ category: 'accessibility', rule: 'no-img-without-alt', severity: 'error', filePath: context.filePath, line: getLine(node), message: '<img> tag is missing alt attribute.', snippet: sliceSnippet(context.content, getLine(node)) });
      }
      if (tag === 'button' && !getJsxAttribute(attrs, 'aria-label') && !hasTextContent(node)) {
        diagnostics.push({ category: 'accessibility', rule: 'no-button-without-label', severity: 'error', filePath: context.filePath, line: getLine(node), message: '<button> has no visible text content or aria-label.', snippet: sliceSnippet(context.content, getLine(node)) });
      }
      if (tag === 'a' && !getJsxAttribute(attrs, 'href')) {
        diagnostics.push({ category: 'accessibility', rule: 'no-anchor-without-href', severity: 'error', filePath: context.filePath, line: getLine(node), message: '<a> tag is missing href attribute.', snippet: sliceSnippet(context.content, getLine(node)) });
      }
      if (tag === 'div' || tag === 'span') {
        const roleAttr = getJsxAttribute(attrs, 'role');
        const hasInteraction = attrs.some((attr) => attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier' && isInteractiveHandlerName(attr.name.name));
        if (hasInteraction && !roleAttr) {
          diagnostics.push({ category: 'accessibility', rule: 'no-missing-aria-role', severity: 'error', filePath: context.filePath, line: getLine(node), message: `Interactive <${tag}> should include a role attribute.`, snippet: sliceSnippet(context.content, getLine(node)) });
        }
      }
    });

    return diagnostics;
  },
};
