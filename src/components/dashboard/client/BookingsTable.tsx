import Link from "next/link";
import { GameMark } from "@/components/dashboard/GameMark";
import { PriceTag } from "@/components/currency/PriceTag";
import { displayStatus, formatOrderDate } from "@/lib/dashboard/orderDisplay";
import type { DispatchOrder } from "@/lib/matchmaking/types";

const STATUS_PILL = {
  upcoming: "dashboard-pill--success",
  completed: "dashboard-pill--muted",
  cancelled: "dashboard-pill--warning",
} as const;

// Sourced from the live matchmaking store (see useAllOrders) — every real
// order this browser has created, not a static mock list.
export function BookingsTable({ orders }: { orders: DispatchOrder[] }) {
  return (
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>Order</th>
          <th>Game</th>
          <th>Option</th>
          <th>Date</th>
          <th>Price</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {orders.map((order) => {
          const status = displayStatus(order.status);
          return (
            <tr key={order.id}>
              <td className="dashboard-table__primary">#{order.orderNo}</td>
              <td>
                <GameMark slug={order.gameSlug} />
              </td>
              <td>
                {order.option} · {order.teammates} teammate{order.teammates > 1 ? "s" : ""}
              </td>
              <td>{formatOrderDate(order.createdAt)}</td>
              <td>
                <PriceTag amountEUR={order.priceEUR} />
              </td>
              <td>
                <span className={`dashboard-pill ${STATUS_PILL[status]}`}>{status}</span>
              </td>
              <td>
                {status === "upcoming" ? (
                  <Link href={`/checkout/matching?order=${order.id}`} className="btn btn--ghost btn--sm">
                    Continue
                  </Link>
                ) : (
                  <Link href={`/games/${order.gameSlug}`} className="btn btn--ghost btn--sm">
                    Rebook
                  </Link>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
