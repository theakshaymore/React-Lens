import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { scanCodebase, scanSnippet, type ScanResult } from 'react-lens';

const execFileAsync = promisify(execFile);

function parseGitHubUrl(repoUrl: string): string {
  const cleaned = repoUrl.trim().replace(/\/$/, '');
  const match = cleaned.match(/^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)(?:\.git)?$/i);
  if (!match) throw new Error('Invalid GitHub repository URL. Expected format: https://github.com/org/repo');

  const owner = match[1];
  const repoMatch = match[2];
  if (!owner || !repoMatch) throw new Error('Invalid GitHub repository URL. Expected format: https://github.com/org/repo');
  const repo = repoMatch.replace(/\.git$/i, '');
  return `https://github.com/${owner}/${repo}.git`;
}

async function scanGitHubRepo(repoUrl: string): Promise<ScanResult> {
  const cloneUrl = parseGitHubUrl(repoUrl);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'react-lens-'));
  try {
    await execFileAsync('git', ['clone', '--depth', '1', cloneUrl, tempDir], { timeout: 120000 });
    return await scanCodebase({ targetPath: tempDir, includeSnippets: true });
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

export async function scanInput(input: { code?: string; repoUrl?: string }): Promise<ScanResult> {
  if (input.code?.trim()) return scanSnippet(input.code.trim(), 'snippet.tsx');
  if (input.repoUrl?.trim()) return scanGitHubRepo(input.repoUrl.trim());
  throw new Error('Provide either code or repoUrl.');
}
