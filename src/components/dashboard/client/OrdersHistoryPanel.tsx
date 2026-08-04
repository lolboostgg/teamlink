"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useAllOrdersState } from "@/lib/matchmaking/useAllOrders";
import { BookingsTable } from "@/components/dashboard/client/BookingsTable";
import { displayStatus } from "@/lib/dashboard/orderDisplay";

const ORDERS_PER_PAGE = 20;
type StatusFilter = "all" | "upcoming" | "completed" | "cancelled";
const STATUS_FILTERS: { value: StatusFilter; label: string; icon: string }[] = [
  { value: "all", label: "All", icon: "fa-solid fa-layer-group" },
  { value: "upcoming", label: "Upcoming", icon: "fa-regular fa-clock" },
  { value: "completed", label: "Completed", icon: "fa-solid fa-check" },
  { value: "cancelled", label: "Cancelled", icon: "fa-solid fa-xmark" },
];

// Full order history for this browser — every real order created via
// checkout, not a static mock list. See useAllOrders().
export function OrdersHistoryPanel() {
  const { orders, loading } = useAllOrdersState();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return orders.filter((order) => {
      if (status !== "all" && displayStatus(order.status) !== status) return false;
      if (!normalizedQuery) return true;
      return [order.id, order.gameSlug, order.option]
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [orders, query, status]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / ORDERS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visibleOrders = filteredOrders.slice(
    (currentPage - 1) * ORDERS_PER_PAGE,
    currentPage * ORDERS_PER_PAGE,
  );

  if (loading) {
    return (
      <div className="dashboard-empty dashboard-empty--loading" aria-live="polite">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
        <p>Loading your orders…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-calendar-xmark" aria-hidden="true" />
        <p>No orders yet.</p>
        <Link href="/games" className="btn btn--vivid btn--sm">
          Book a teammate
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="orders-toolbar">
        <label className="orders-toolbar__search">
          <span className="orders-toolbar__search-icon" aria-hidden="true">
            <i className="fa-solid fa-magnifying-glass" />
          </span>
          <input
            type="search"
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1); }}
            placeholder="Search your orders…"
            aria-label="Search orders"
          />
          {query && (
            <button type="button" className="orders-toolbar__search-clear" aria-label="Clear search" onClick={() => { setQuery(""); setPage(1); }}>
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
          )}
        </label>
        <div className="orders-status-pills" role="group" aria-label="Filter orders by status">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              className={`orders-status-pill orders-status-pill--${filter.value}${status === filter.value ? " is-active" : ""}`}
              aria-pressed={status === filter.value}
              onClick={() => { setStatus(filter.value); setPage(1); }}
            >
              <i className={filter.icon} aria-hidden="true" />
              {filter.label}
            </button>
          ))}
        </div>
        <span className="orders-toolbar__count">
          {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}
        </span>
      </div>

      {visibleOrders.length > 0 ? (
        <div className="orders-table-wrap">
          <BookingsTable orders={visibleOrders} />
        </div>
      ) : (
        <div className="dashboard-empty dashboard-empty--compact">
          <i className="fa-solid fa-filter-circle-xmark" aria-hidden="true" />
          <p>No orders match your filters.</p>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => { setQuery(""); setStatus("all"); }}>
            Clear filters
          </button>
        </div>
      )}

      {pageCount > 1 && (
        <nav className="orders-pagination" aria-label="Orders pagination">
          <span>
            {(currentPage - 1) * ORDERS_PER_PAGE + 1}–{Math.min(currentPage * ORDERS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length}
          </span>
          <div className="orders-pagination__buttons">
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              aria-label="Previous page"
            >
              <i className="fa-solid fa-chevron-left" aria-hidden="true" />
              Previous
            </button>
            <span className="orders-pagination__page">Page {currentPage} of {pageCount}</span>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              disabled={currentPage === pageCount}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              aria-label="Next page"
            >
              Next
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
