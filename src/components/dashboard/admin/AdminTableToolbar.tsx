"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OrdersStatusSelect, type OrdersStatusOption } from "@/components/dashboard/OrdersStatusSelect";

interface Filter {
  /** Query-string key this dropdown writes to, e.g. "status" or "role". */
  param: string;
  value: string;
  options: OrdersStatusOption[];
}

interface Props {
  initialQuery: string;
  placeholder: string;
  searchLabel: string;
  filter?: Filter;
}

/**
 * Search + one optional dropdown above an admin table. Shared by orders,
 * users and teammates — they only differ in what the dropdown filters on.
 *
 * Navigation always drops the `page` param: after narrowing the result set,
 * page 7 is usually out of range and lands on an empty table.
 */
export function AdminTableToolbar({ initialQuery, placeholder, searchLabel, filter }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [filterValue, setFilterValue] = useState(filter?.value ?? "");
  const filterRef = useRef(filter?.value ?? "");
  const firstRender = useRef(true);

  function navigate(nextQuery: string, nextFilter: string) {
    const params = new URLSearchParams();
    const cleanQuery = nextQuery.trim();
    if (cleanQuery) params.set("q", cleanQuery);
    if (filter && nextFilter) params.set(filter.param, nextFilter);
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => navigate(query, filterRef.current), 300);
    return () => window.clearTimeout(timer);
    // The dropdown navigates immediately in its own handler; only typing is
    // debounced, so re-running this on a filter change would double-navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const clearSearch = () => {
    setQuery("");
    navigate("", filterValue);
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
          placeholder={placeholder}
          aria-label={searchLabel}
        />
        {query && (
          <button type="button" className="orders-toolbar__search-clear" aria-label="Clear search" onClick={clearSearch}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        )}
      </label>

      {filter && (
        <OrdersStatusSelect
          value={filterValue}
          options={filter.options}
          onChange={(next) => {
            filterRef.current = next;
            setFilterValue(next);
            navigate(query, next);
          }}
        />
      )}

      {(query || filterValue) && (
        <Link
          className="orders-toolbar__reset"
          href={pathname}
          onClick={() => {
            filterRef.current = "";
            setQuery("");
            setFilterValue("");
          }}
        >
          Reset
        </Link>
      )}
    </div>
  );
}
