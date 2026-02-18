import type { TSESTree } from '@typescript-eslint/typescript-estree';

export function walk(node: unknown, visit: (node: TSESTree.Node) => void): void {
  if (!node || typeof node !== 'object') return;

  const maybeNode = node as Record<string, unknown>;
  if (typeof maybeNode.type === 'string') {
    visit(maybeNode as unknown as TSESTree.Node);
  }

  for (const value of Object.values(maybeNode)) {
    if (Array.isArray(value)) {
      for (const item of value) walk(item, visit);
    } else {
      walk(value, visit);
    }
  }
}

export function getLine(node: TSESTree.Node): number {
  return node.loc?.start.line ?? 1;
}

export function sliceSnippet(content: string, line: number): string {
  const lines = content.split('\n');
  const start = Math.max(0, line - 2);
  const end = Math.min(lines.length, line + 1);
  return lines.slice(start, end).join('\n');
}

export function getJsxAttribute(
  attrs: Array<TSESTree.JSXAttribute | TSESTree.JSXSpreadAttribute>,
  name: string,
): TSESTree.JSXAttribute | undefined {
  return attrs.find(
    (attr): attr is TSESTree.JSXAttribute =>
      attr.type === 'JSXAttribute' && attr.name.type === 'JSXIdentifier' && attr.name.name === name,
  );
}

export function getJsxElementName(
  name: TSESTree.JSXIdentifier | TSESTree.JSXMemberExpression | TSESTree.JSXNamespacedName,
): string {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') return `${getJsxElementName(name.object)}.${name.property.name}`;
  return `${name.namespace.name}:${name.name.name}`;
}
