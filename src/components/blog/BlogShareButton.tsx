'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

type BlogShareButtonProps = {
  title: string;
  url: string;
  text?: string;
};

// Native share where available (mobile), silent copy-to-clipboard fallback
// (desktop). No third-party share widgets, no tracking.
export default function BlogShareButton({ title, url, text }: BlogShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: text ?? title, url });
        return;
      } catch {
        // User dismissed the sheet, or share failed — fall through to copy.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (e.g. insecure context) — nothing else we can do.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 border border-[var(--theme-border)] px-4 py-2 text-sm font-medium text-[var(--theme-text)] transition-colors hover:bg-[color-mix(in_srgb,var(--theme-text)_6%,transparent)]"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? 'Link disalin' : 'Bagikan'}
    </button>
  );
}
