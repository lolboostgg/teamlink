import { GameMark } from "@/components/dashboard/GameMark";
import { formatOrderDate } from "@/lib/dashboard/orderDisplay";
import type { DispatchOrder } from "@/lib/matchmaking/types";

const STATUS_LABEL: Partial<Record<DispatchOrder["status"], string>> = {
  assigned: "Starting soon",
  in_progress: "In progress",
  completed: "Completed",
};

// Sourced from the real dispatch store, scoped to orders this teammate is
// actually assigned to (see useIncomingDispatches/useAllOrders callers) —
// not a static mock list.
export function SessionsList({ orders }: { orders: DispatchOrder[] }) {
  return (
    <div className="dashboard-list">
      {orders.map((order) => {
        return (
          <div className="dashboard-list-item" key={order.id}>
            <GameMark slug={order.gameSlug} />
            <div className="dashboard-list-item__meta">
              <div className="dashboard-list-item__title">#{order.orderNo} · {order.customerLabel}</div>
              <div className="dashboard-list-item__sub">
                {formatOrderDate(order.createdAt)} · {STATUS_LABEL[order.status] ?? order.status}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
