import { ClipboardCheck } from 'lucide-react';

type EmptyTabStateProps = {
  description?: string;
  title?: string;
};

export function EmptyTabState({
  description = 'Todos los protocolos regulatorios correspondientes a esta etapa de inspeccion han sido completados o transferidos.',
  title = 'No hay ordenes asignadas en esta seccion',
}: EmptyTabStateProps) {
  return (
    <div className="w-full rounded-lg border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center">
      <ClipboardCheck
        aria-hidden="true"
        className="mx-auto h-12 w-12 text-slate-400"
        strokeWidth={1.8}
      />
      <h2 className="mt-4 text-base font-semibold text-slate-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}
