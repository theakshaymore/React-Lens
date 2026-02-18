import { parse } from '@typescript-eslint/typescript-estree';
import type { TSESTree } from '@typescript-eslint/typescript-estree';

export function parseCode(code: string): TSESTree.Program {
  return parse(code, {
    comment: false,
    jsx: true,
    loc: true,
    range: true,
    errorOnUnknownASTType: false,
  });
}
