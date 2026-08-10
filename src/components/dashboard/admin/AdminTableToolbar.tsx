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
  placeholder?: string;
  searchLabel?: string;
  /** Rendered left to right; each writes its own query-string key. */
  filters?: Filter[];
  /** Some tables filter but have nothing worth searching by. */
  searchable?: boolean;
  filterDisplay?: "select" | "pills";
}

/**
 * Search + one optional dropdown above an admin table. Shared by orders,
 * users and teammates — they only differ in what the dropdown filters on.
 *
 * Navigation always drops the `page` param: after narrowing the result set,
 * page 7 is usually out of range and lands on an empty table.
 */
export function AdminTableToolbar({
  initialQuery,
  placeholder = "Search…",
  searchLabel = "Search",
  filters = [],
  searchable = true,
  filterDisplay = "select",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initialQuery);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(filters.map((entry) => [entry.param, entry.value])),
  );
  // Mirrors `values` for the debounced search callback, which would otherwise
  // close over a stale copy.
  const valuesRef = useRef(values);
  const firstRender = useRef(true);

  function navigate(nextQuery: string, nextValues: Record<string, string>) {
    const params = new URLSearchParams();
    const cleanQuery = nextQuery.trim();
    if (cleanQuery) params.set("q", cleanQuery);
    for (const [param, value] of Object.entries(nextValues)) {
      if (value) params.set(param, value);
    }
    const search = params.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = window.setTimeout(() => navigate(query, valuesRef.current), 300);
    return () => window.clearTimeout(timer);
    // The dropdowns navigate immediately in their own handler; only typing is
    // debounced, so re-running this on a filter change would double-navigate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const clearSearch = () => {
    setQuery("");
    navigate("", valuesRef.current);
  };

  const anyFilterSet = Object.values(values).some(Boolean);

  return (
    <div className="orders-toolbar admin-orders-toolbar">
      {searchable && (
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
      )}

      {filters.map((entry) => {
        const change = (next: string) => {
          const updated = { ...valuesRef.current, [entry.param]: next };
          valuesRef.current = updated;
          setValues(updated);
          navigate(query, updated);
        };
        return filterDisplay === "pills" ? (
          <div className="admin-filter-pills" role="group" aria-label={`Filter by ${entry.param}`} key={entry.param}>
            {entry.options.map((option) => (
              <button
                type="button"
                key={option.value}
                className={`admin-filter-pill${(values[entry.param] ?? "") === option.value ? " is-active" : ""}`}
                aria-pressed={(values[entry.param] ?? "") === option.value}
                onClick={() => change(option.value)}
              >
                {option.icon && <i className={option.icon} aria-hidden="true" />}
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <OrdersStatusSelect key={entry.param} value={values[entry.param] ?? ""} options={entry.options} onChange={change} />
        );
      })}

      {(query || anyFilterSet) && (
        <Link
          className="orders-toolbar__reset"
          href={pathname}
          onClick={() => {
            const cleared = Object.fromEntries(filters.map((entry) => [entry.param, ""]));
            valuesRef.current = cleared;
            setQuery("");
            setValues(cleared);
          }}
        >
          Reset
        </Link>
      )}
    </div>
  );
}
