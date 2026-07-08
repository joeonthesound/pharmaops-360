'use client';

import * as Tabs from '@radix-ui/react-tabs';

type TechnicalFichaTabsProps = {
  datosGenerales: Array<{ label: string; value: string }>;
  limitesGxp: Array<{ label: string; value: string }>;
  registroFabrica: Array<{ label: string; value: string }>;
};

function FieldGrid({ fields }: { fields: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {fields.map((field) => (
        <div className="min-w-0 rounded-md border border-slate-100 bg-slate-50 px-3 py-2" key={field.label}>
          <p className="max-h-8 overflow-hidden text-[11px] font-bold uppercase leading-4 tracking-wide text-slate-500">
            {field.label}
          </p>
          <p className="mt-1 max-h-10 overflow-hidden text-sm font-semibold leading-5 text-slate-950">
            {field.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function TechnicalFichaTabs({
  datosGenerales,
  limitesGxp,
  registroFabrica,
}: TechnicalFichaTabsProps) {
  const triggerClass =
    'rounded-md px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-500 transition data-[state=active]:bg-slate-900 data-[state=active]:text-white';

  return (
    <Tabs.Root className="mt-4 grid gap-4" defaultValue="datos-generales">
      <Tabs.List className="grid grid-cols-3 gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
        <Tabs.Trigger className={triggerClass} value="datos-generales">
          Datos Generales
        </Tabs.Trigger>
        <Tabs.Trigger className={triggerClass} value="limites-gxp">
          Limites GxP
        </Tabs.Trigger>
        <Tabs.Trigger className={triggerClass} value="registro-fabrica">
          Registro Fabrica
        </Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="datos-generales">
        <FieldGrid fields={datosGenerales} />
      </Tabs.Content>
      <Tabs.Content value="limites-gxp">
        <FieldGrid fields={limitesGxp} />
      </Tabs.Content>
      <Tabs.Content value="registro-fabrica">
        <FieldGrid fields={registroFabrica} />
      </Tabs.Content>
    </Tabs.Root>
  );
}
