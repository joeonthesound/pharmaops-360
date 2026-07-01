'use client';

import Link from 'next/link';
import { Component, type ReactNode } from 'react';
import type { DashboardView } from './dashboardTypes';

type DashboardTabErrorBoundaryProps = {
  children: ReactNode;
  title: string;
  view: DashboardView;
};

type DashboardTabErrorBoundaryState = {
  hasError: boolean;
};

export class DashboardTabErrorBoundary extends Component<
  DashboardTabErrorBoundaryProps,
  DashboardTabErrorBoundaryState
> {
  state: DashboardTabErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DashboardTabErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <LocalReloadCard title={this.props.title} view={this.props.view} />
      );
    }

    return this.props.children;
  }
}

export function LocalReloadCard({ title, view }: { title: string; view: DashboardView }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900 shadow-sm">
      <p className="font-bold">{title} no pudo renderizarse.</p>
      <p className="mt-1 font-medium">
        El fallo quedo contenido en esta pestana; las demas vistas permanecen disponibles.
      </p>
      <Link
        className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-red-700 px-4 text-sm font-semibold text-white transition hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-200"
        href={`/dashboard?view=${view}`}
      >
        Recargar pestana
      </Link>
    </div>
  );
}
