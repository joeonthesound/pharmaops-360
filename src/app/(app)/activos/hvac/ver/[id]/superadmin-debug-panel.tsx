'use client';

import { useState } from 'react';

type SuperadminDebugPanelProps = {
  payload: unknown;
};

export function SuperadminDebugPanel({ payload }: SuperadminDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-40 print:hidden">
      <button
        className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-blue-900 shadow-lg transition hover:bg-blue-100"
        onClick={() => setIsOpen((current) => !current)}
        type="button"
      >
        SuperAdmin Debug {isOpen ? 'ON' : 'OFF'}
      </button>

      {isOpen ? (
        <div className="mt-2 max-h-96 w-[min(92vw,720px)] overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-4 text-left shadow-2xl">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-blue-200">
            Raw JSON state layer
          </p>
          <pre className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-emerald-300">
            {JSON.stringify(payload, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  );
}
