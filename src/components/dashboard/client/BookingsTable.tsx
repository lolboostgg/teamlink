import Link from "next/link";
import { GameMark } from "@/components/dashboard/GameMark";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { PriceTag } from "@/components/currency/PriceTag";
import { displayStatus, formatOrderDate } from "@/lib/dashboard/orderDisplay";
import { getTeammateById } from "@/lib/teammates";
import type { DispatchOrder } from "@/lib/matchmaking/types";

const STATUS_PILL = { upcoming: "dashboard-pill--success", completed: "dashboard-pill--muted", cancelled: "dashboard-pill--warning" } as const;

export function BookingsTable({ orders }: { orders: DispatchOrder[] }) {
  return <table className="dashboard-table client-orders-table">
    <thead><tr><th>Game</th><th>Order ID</th><th>Option</th><th>Teammate</th><th>Status</th><th>Price</th><th>Date</th><th /></tr></thead>
    <tbody>{orders.map((order) => {
      const status = displayStatus(order.status);
      const teammate = order.selectedTeammateId ? getTeammateById(order.selectedTeammateId) : null;
      return <tr key={order.id}>
        <td><span className="client-order-game"><GameMark slug={order.gameSlug} /><strong>{order.gameName}</strong></span></td>
        <td className="dashboard-table__primary">#{order.orderNo}</td>
        <td><span className="client-order-option"><strong>{order.option}</strong><small>{order.teammates} teammate{order.teammates > 1 ? "s" : ""} · {order.gamesBooked} game{order.gamesBooked > 1 ? "s" : ""}</small></span></td>
        <td>{teammate ? <span className="client-order-teammate"><span className="client-order-teammate__avatar"><SafeAvatarImage src={teammate.avatarUrl} /></span><span><strong>{teammate.name}</strong>{order.selectedTeammateIds.length > 1 && <small>+{order.selectedTeammateIds.length - 1} more</small>}</span></span> : <span className="client-order-teammate client-order-teammate--pending"><span className="client-order-teammate__avatar"><i className="fa-solid fa-user-clock" /></span><span>Not assigned</span></span>}</td>
        <td><span className={`dashboard-pill ${STATUS_PILL[status]}`}>{status}</span></td>
        <td><PriceTag amountEUR={order.priceEUR} /></td>
        <td>{formatOrderDate(order.createdAt)}</td>
        <td>{status === "upcoming" ? <Link href={`/checkout/matching?order=${order.orderNo}`} className="btn btn--ghost btn--sm">Continue</Link> : <Link href={`/games/${order.gameSlug}`} className="btn btn--ghost btn--sm">Rebook</Link>}</td>
      </tr>;
    })}</tbody>
  </table>;
}
