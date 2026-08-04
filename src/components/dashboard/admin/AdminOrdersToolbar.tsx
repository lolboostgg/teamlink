"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OrdersStatusSelect, type OrdersStatusOption } from "@/components/dashboard/OrdersStatusSelect";

type Props = {
  initialQuery: string;
  initialStatus: string;
  statusOptions: OrdersStatusOption[];
};

export function AdminOrdersToolbar({ initialQuery, initialStatus, statusOptions }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const statusRef = useRef(initialStatus);
  const firstRender = useRef(true);

  function navigate(nextQuery: string, nextStatus: string) {
    const params = new URLSearchParams();
    const cleanQuery = nextQuery.trim();
    if (cleanQuery) params.set("q", cleanQuery);
    if (nextStatus) params.set("status", nextStatus);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => navigate(query, statusRef.current), 300);
    return () => window.clearTimeout(timer);
    // Status changes navigate immediately in the select handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const clearSearch = () => {
    setQuery("");
    navigate("", status);
  };

  return (
    <div className="orders-toolbar admin-orders-toolbar">
      <label className="orders-toolbar__search">
        <span className="orders-toolbar__search-icon" aria-hidden="true">
          <i className="fa-solid fa-magnifying-glass" />
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search order, client, game or teammate…"
          aria-label="Search orders"
        />
        {query && (
          <button type="button" className="orders-toolbar__search-clear" aria-label="Clear search" onClick={clearSearch}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        )}
      </label>
      <OrdersStatusSelect
        value={status}
        options={statusOptions}
        onChange={(nextStatus) => {
          statusRef.current = nextStatus;
          setStatus(nextStatus);
          navigate(query, nextStatus);
        }}
      />
      {(query || status) && (
        <Link className="orders-toolbar__reset" href={pathname} onClick={() => { statusRef.current = ""; setQuery(""); setStatus(""); }}>
          Reset
        </Link>
      )}
    </div>
  );
}
