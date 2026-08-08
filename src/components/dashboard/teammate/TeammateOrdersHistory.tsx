"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GameMark } from "@/components/dashboard/GameMark";
import { PriceTag } from "@/components/currency/PriceTag";
import { displayStatus, formatOrderDate } from "@/lib/dashboard/orderDisplay";
import { useAllOrdersState } from "@/lib/matchmaking/useAllOrders";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";

type Filter = "all" | "upcoming" | "completed" | "cancelled";
const FILTERS: { value: Filter; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "fa-solid fa-layer-group" },
  { value: "upcoming", label: "Upcoming", icon: "fa-regular fa-clock" },
  { value: "completed", label: "Completed", icon: "fa-solid fa-check" },
  { value: "cancelled", label: "Cancelled", icon: "fa-solid fa-xmark" },
];
const PILL = { upcoming: "dashboard-pill--success", completed: "dashboard-pill--muted", cancelled: "dashboard-pill--warning" } as const;

export function TeammateOrdersHistory() {
  const { orders, loading } = useAllOrdersState();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => orders.filter((order) => {
    const status = displayStatus(order.status);
    if (filter !== "all" && status !== filter) return false;
    const q = query.trim().toLowerCase();
    return !q || [order.orderNo, order.gameName, order.option, order.customerLabel].some((value) => String(value).toLowerCase().includes(q));
  }), [orders, query, filter]);

  if (loading) return <div className="dashboard-empty"><i className="fa-solid fa-spinner fa-spin" /><p>Loading orders…</p></div>;

  return <div className="dashboard-panel teammate-orders-panel">
    <div className="dashboard-panel__head"><div><div className="dashboard-panel__title">Your orders</div><div className="dashboard-panel__sub">Assigned, active and completed sessions</div></div></div>
    <div className="orders-toolbar">
      <label className="orders-toolbar__search"><span className="orders-toolbar__search-icon"><i className="fa-solid fa-magnifying-glass" /></span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your orders…" /></label>
      <div className="orders-status-pills">{FILTERS.map((item) => <button key={item.value} type="button" className={`orders-status-pill orders-status-pill--${item.value}${filter === item.value ? " is-active" : ""}`} onClick={() => setFilter(item.value)}><i className={item.icon} />{item.label}</button>)}</div>
      <span className="orders-toolbar__count">{visible.length} {visible.length === 1 ? "order" : "orders"}</span>
    </div>
    {visible.length ? <div className="orders-table-wrap"><table className="dashboard-table client-orders-table teammate-orders-table">
      <thead><tr><th>Game</th><th>Order ID</th><th>Option</th><th>Client</th><th>Status</th><th>Price</th><th>Date</th><th /></tr></thead>
      <tbody>{visible.map((order) => { const status = displayStatus(order.status); return <tr key={order.id}>
        <td><span className="client-order-game"><GameMark slug={order.gameSlug} /><strong>{order.gameName}</strong></span></td>
        <td className="dashboard-table__primary">#{order.orderNo}</td>
        <td><span className="client-order-option"><strong>{order.option}</strong><small>{order.gamesBooked} game{order.gamesBooked === 1 ? "" : "s"}</small></span></td>
        <td><span className="client-order-teammate"><span className="client-order-teammate__avatar"><SafeAvatarImage src={order.customerAvatarUrl} /></span><strong>{order.customerLabel}</strong></span></td>
        <td><span className={`dashboard-pill ${PILL[status]}`}>{status}</span></td><td><PriceTag amountEUR={order.priceEUR} /></td><td>{formatOrderDate(order.createdAt)}</td>
        <td><Link href={`/dashboard/teammate/session/${order.orderNo}`} className="btn btn--ghost btn--sm">View</Link></td>
      </tr>; })}</tbody>
    </table></div> : <div className="dashboard-empty"><i className="fa-solid fa-receipt" /><p>No orders match your filters.</p></div>}
  </div>;
}
