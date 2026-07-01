import { LocalReloadCard } from './DashboardTabErrorBoundary';
import { fetchDashboardOrdersByStatuses } from './dashboardData';
import { SENT_STATUSES } from './dashboardTypes';
import { EmptyTabState } from './EmptyTabState';
import { OrderCard } from './OrderCard';

export async function SentOrdersTab() {
  try {
    const { data: orders, error } = await fetchDashboardOrdersByStatuses(SENT_STATUSES);

    if (error) {
      return <LocalReloadCard title="Ordenes enviadas" view="sent" />;
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
    return <LocalReloadCard title="Ordenes enviadas" view="sent" />;
  }
}
