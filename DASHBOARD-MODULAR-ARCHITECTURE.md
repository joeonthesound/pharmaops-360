# Dashboard Modular Architecture

## Scope

The dashboard under `src/app/(app)/dashboard/` is now a slim route-level view manager. It owns the shell, tab navigation, creation confirmation banner, and `?view=` synchronization only. Workflow data is no longer fetched as one shared array and then sliced between views.

## View Modules

Each operational tab is an isolated server component with its own Supabase query and local fallback:

- `PendingOrdersTab.tsx`: loads only `DRAFT` and `PENDING_TECHNICIAN`.
- `SentOrdersTab.tsx`: loads only `PENDING_SUPERVISOR`, `PENDING_QUALITY`, and `PENDING_MANAGEMENT`.
- `RejectedOrdersTab.tsx`: loads only records strictly set to `RECHAZADO_TECNICO`.
- `TechnicalHistoryTab.tsx`: loads immutable history records through the terminal allow-list `APPROVED` and `PENDING_MANAGEMENT`, plus case-insensitive legacy checks for approved/completed/cerrado rows. The history service binds records to the authenticated technician through the schema-backed `assigned_technician` field.

Shared status literals, route synchronization types, labels, classes, and card helpers live in `dashboardTypes.ts`. Supabase access is centralized in `dashboardData.ts`, but each tab calls it independently with its own status allow-list.

## State Interfaces

The route-level state interface is:

```ts
type DashboardView = 'pending' | 'sent' | 'rejected' | 'history';
```

The route accepts `DashboardSearchParams`, including:

```ts
{
  view?: string;
  q?: string;
  asset?: string;
  risk?: string;
  deviations?: string;
  aging?: string;
  order_created?: string;
  record?: string;
}
```

`normalizeView()` converts unsupported or missing `view` values to `pending`. The history filters remain scoped to `TechnicalHistoryTab`; pending, sent, and rejected views do not receive or reuse history arrays.

## Error Containment

Each active tab is wrapped by `DashboardTabErrorBoundary`, a client-side React error boundary that renders a local reload card instead of collapsing the dashboard shell. Each tab also contains a server-side local guard around its fetch and render logic, so Supabase errors or server rendering exceptions return the same contained fallback.

This gives the dashboard two layers of containment:

- Server guard: protects async data loading and server-rendered tab content.
- React error boundary: protects client-side hydration and runtime failures inside the tab subtree.

If `PendingOrdersTab` or `SentOrdersTab` fails because of status parsing, malformed payloads, or a rendering exception, only that tab shows the local reload card. The tab navigation and `TechnicalHistoryTab` remain independently available through `?view=history`, preserving technical data availability for GxP audit review.

## Verification

`npm run typecheck` passes with the modular dashboard components and uppercase workflow literals.
