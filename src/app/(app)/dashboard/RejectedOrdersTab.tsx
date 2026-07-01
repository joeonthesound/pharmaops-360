import { LocalReloadCard } from './DashboardTabErrorBoundary';
import { fetchDashboardOrdersByStatuses } from './dashboardData';
import { REJECTED_STATUSES } from './dashboardTypes';
import { EmptyTabState } from './EmptyTabState';
import { OrderCard } from './OrderCard';

export async function RejectedOrdersTab() {
  try {
    const { data: orders, error } = await fetchDashboardOrdersByStatuses(REJECTED_STATUSES, {
      openOnly: true,
    });

    if (error) {
      return <LocalReloadCard title="Ordenes rechazadas" view="rejected" />;
    }

    if (orders.length === 0) {
      return <EmptyTabState />;
    }

    return (
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((registro) => (
          <OrderCard key={registro.uuid} registro={registro} />
        ))}
      </div>
    );
  } catch {
    return <LocalReloadCard title="Ordenes rechazadas" view="rejected" />;
  }
}
