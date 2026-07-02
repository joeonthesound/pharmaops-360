'use client';

import Link from 'next/link';
import { ArrowLeft, ChevronRight, Download, Printer } from 'lucide-react';

type ApprovalHeaderToolbarProps = {
  area: string;
};

export function ApprovalHeaderToolbar({ area }: ApprovalHeaderToolbarProps) {
  function handleExportControlledCopy() {
    console.info('[P360 CONTROLLED COPY EXPORT]', {
      area,
      action: 'EXPORT_CONTROLLED_PDF_PLACEHOLDER',
      requestedAt: new Date().toISOString(),
    });
  }

  function handleNextPendingOrder() {
    console.info('[P360 NEXT PENDING ORDER]', {
      area,
      action: 'NEXT_PENDING_ORDER_PLACEHOLDER',
      requestedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
          href={`/mantenimiento/${area}/rui/ht`}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Regresar al Historial
        </Link>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
          onClick={handleNextPendingOrder}
          type="button"
        >
          Siguiente Orden Pendiente
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-300"
          onClick={() => window.print()}
          type="button"
        >
          <Printer aria-hidden="true" className="h-4 w-4" />
          Imprimir Reporte
        </button>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-700 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          onClick={handleExportControlledCopy}
          type="button"
        >
          <Download aria-hidden="true" className="h-4 w-4" />
          Exportar PDF (Copia Controlada)
        </button>
      </div>
    </div>
  );
}
