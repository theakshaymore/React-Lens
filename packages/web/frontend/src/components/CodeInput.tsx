import { type FormEvent, type ReactElement, useState } from 'react';
import { Code2, Github, Globe2, LoaderCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface CodeInputProps {
  onScan: (payload: { code?: string; repoUrl?: string; share: boolean }) => Promise<void>;
  loading: boolean;
}

export function CodeInput({ onScan, loading }: CodeInputProps): ReactElement {
  const [mode, setMode] = useState<'code' | 'repo'>('code');
  const [code, setCode] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [share, setShare] = useState(true);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await onScan({ code: mode === 'code' ? code : undefined, repoUrl: mode === 'repo' ? repoUrl : undefined, share });
  };

  return (
    <motion.form onSubmit={handleSubmit} className="glass-card space-y-5 p-5 sm:p-6" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setMode('code')} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all duration-300 ${mode === 'code' ? 'border-accent bg-accent/20 text-indigo-200' : 'border-border bg-surfaceAlt text-textSecondary hover:text-text'}`}><Code2 className="h-4 w-4" />Paste Code</button>
        <button type="button" onClick={() => setMode('repo')} className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all duration-300 ${mode === 'repo' ? 'border-accent bg-accent/20 text-indigo-200' : 'border-border bg-surfaceAlt text-textSecondary hover:text-text'}`}><Github className="h-4 w-4" />GitHub URL</button>
      </div>

      {mode === 'code' ? (
        <div className="space-y-2">
          <p className="text-xs text-textSecondary">Syntax hint: TSX / JSX. Scanner supports React + TypeScript.</p>
          <textarea value={code} onChange={(event) => setCode(event.target.value)} placeholder={`function Button() {\n  return <button aria-label=\"Save\">Save</button>;\n}`} rows={14} className="input-dark font-mono text-sm" required />
        </div>
      ) : (
        <div className="relative">
          <Globe2 className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-textSecondary" />
          <input value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} placeholder="https://github.com/org/repo" className="input-dark pl-11" required />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-textSecondary">
          <input type="checkbox" checked={share} onChange={(event) => setShare(event.target.checked)} className="h-4 w-4 rounded border-border bg-surfaceAlt text-accent" />
          Create share URL
        </label>

        <button type="submit" className="btn-primary min-w-36" disabled={loading}>
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          {loading ? 'Scanning...' : 'Analyze'}
        </button>
      </div>

      {loading ? <div className="flex items-center gap-2 text-sm text-indigo-200"><LoaderCircle className="h-4 w-4 animate-spin" />Scanning your codebase...</div> : null}
    </motion.form>
  );
}
