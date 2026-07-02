'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

type CopyRuiButtonProps = {
  value: string;
};

export function CopyRuiButton({ value }: CopyRuiButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <span className="relative inline-flex shrink-0 items-center">
      <button
        aria-label="Copiar valor"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-current/20 bg-white/60 text-current transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-white/60"
        onClick={handleCopy}
        type="button"
      >
        {copied ? (
          <Check aria-hidden="true" className="h-4 w-4" />
        ) : (
          <Copy aria-hidden="true" className="h-4 w-4" />
        )}
      </button>
      {copied ? (
        <span className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 rounded-md bg-slate-950 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg">
          Copiado
        </span>
      ) : null}
    </span>
  );
}
