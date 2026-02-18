import { type ReactElement, useState } from 'react';
import { Check, Copy, Share2, Twitter } from 'lucide-react';
import { motion } from 'framer-motion';

interface ShareCardProps { shareId: string | null; }

export function ShareCard({ shareId }: ShareCardProps): ReactElement | null {
  const [copied, setCopied] = useState(false);
  if (!shareId) return null;

  const url = `${window.location.origin}/share?id=${shareId}`;
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('My react-lens code health report')}&url=${encodeURIComponent(url)}`;

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.section className="glass-card space-y-4 p-5" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: 'easeOut', delay: 0.2 }}>
      <div className="flex items-center gap-2"><Share2 className="h-4 w-4 text-indigo-300" /><h2 className="text-base font-semibold">Share Report</h2></div>
      <div className="flex flex-col gap-3 sm:flex-row"><input readOnly value={url} className="input-dark font-mono text-xs" /><button type="button" onClick={copy} className="btn-primary min-w-32">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied!' : 'Copy Link'}</button></div>
      <div className="flex flex-wrap gap-2">
        <a href={tweetUrl} target="_blank" rel="noreferrer" className="btn-outline"><Twitter className="h-3.5 w-3.5" />Share on X</a>
        <button type="button" className="btn-outline" onClick={async () => { if (navigator.share) await navigator.share({ title: 'react-lens report', url }); else await copy(); }}><Share2 className="h-3.5 w-3.5" />Share</button>
      </div>
    </motion.section>
  );
}
