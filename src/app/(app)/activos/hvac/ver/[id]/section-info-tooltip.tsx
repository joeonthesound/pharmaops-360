'use client';

import * as Tooltip from '@radix-ui/react-tooltip';
import { HelpCircle } from 'lucide-react';

type SectionInfoTooltipProps = {
  label: string;
  message: string;
};

export function SectionInfoTooltip({ label, message }: SectionInfoTooltipProps) {
  return (
    <Tooltip.Provider delayDuration={120}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            aria-label={`Informacion de ${label}`}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-500 shadow-sm transition hover:border-slate-400 hover:bg-white hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
            type="button"
          >
            <HelpCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-[95] max-w-sm rounded-md border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-semibold leading-6 text-white shadow-xl"
            side="top"
            sideOffset={8}
          >
            <p>{message}</p>
            <p className="mt-2 text-xs font-bold text-slate-200">
              Para ampliar la informacion, consulte la documentacion oficial en el manual.{' '}
              <a
                className="font-black text-emerald-300 underline decoration-emerald-300 underline-offset-4"
                href="/docs/protocolos"
              >
                /docs/protocolos
              </a>
            </p>
            <Tooltip.Arrow className="fill-slate-950" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}
