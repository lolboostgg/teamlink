import Link from "next/link";

export interface FilterPillGroup {
  /** Query-string key this group writes to. */
  param: string;
  label: string;
  active: string;
  options: { value: string; label: string; icon?: string }[];
}

/**
 * Segmented filters above a table. Plain links rather than a dropdown: with
 * three or four choices every option is worth showing, and the current one
 * is then visible without opening anything.
 *
 * Selecting always drops `page` — after narrowing a result set, page 7 is
 * usually out of range.
 */
export function TableFilterPills({ groups, basePath }: { groups: FilterPillGroup[]; basePath: string }) {
  function hrefFor(param: string, value: string) {
    const next = new URLSearchParams();
    for (const group of groups) {
      const current = group.param === param ? value : group.active;
      if (current) next.set(group.param, current);
    }
    const search = next.toString();
    return search ? `${basePath}?${search}` : basePath;
  }

  return (
    <div className="filter-pills">
      {groups.map((group) => (
        <div className="filter-pills__group" key={group.param} role="group" aria-label={group.label}>
          {group.options.map((option) => {
            const active = group.active === option.value;
            return (
              <Link
                key={option.value || "all"}
                href={hrefFor(group.param, option.value)}
                className={`filter-pill${active ? " is-active" : ""}`}
                aria-current={active ? "true" : undefined}
                scroll={false}
              >
                {option.icon && <i className={option.icon} aria-hidden="true" />}
                {option.label}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}
