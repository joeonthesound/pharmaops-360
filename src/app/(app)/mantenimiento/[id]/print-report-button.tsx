'use client';

import { Printer } from 'lucide-react';

export function PrintReportButton() {
  return (
    <button
      className="print:hidden inline-flex h-11 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100"
      onClick={() => window.print()}
      type="button"
    >
      <Printer size={16} />
      Imprimir Reporte
    </button>
  );
}
