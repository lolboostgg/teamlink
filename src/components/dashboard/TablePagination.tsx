import Link from "next/link";

interface Props {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  /** Builds the href for a page number, carrying the current filters. */
  hrefFor: (page: number) => string;
  label: string;
}

/**
 * The pager under every paginated admin table. Renders nothing for a single
 * page, so callers don't need to guard the call site.
 */
export function TablePagination({ page, pageCount, total, pageSize, hrefFor, label }: Props) {
  if (pageCount <= 1) return null;

  return (
    <nav className="orders-pagination" aria-label={label}>
      <span>
        {(page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="orders-pagination__buttons">
        {page > 1 ? (
          <Link className="btn btn--ghost btn--sm" href={hrefFor(page - 1)}>
            <i className="fa-solid fa-chevron-left" aria-hidden="true" /> Previous
          </Link>
        ) : (
          <span className="btn btn--ghost btn--sm is-disabled">Previous</span>
        )}
        <span className="orders-pagination__page">
          Page {page} of {pageCount}
        </span>
        {page < pageCount ? (
          <Link className="btn btn--ghost btn--sm" href={hrefFor(page + 1)}>
            Next <i className="fa-solid fa-chevron-right" aria-hidden="true" />
          </Link>
        ) : (
          <span className="btn btn--ghost btn--sm is-disabled">Next</span>
        )}
      </div>
    </nav>
  );
}

/**
 * Clamps a `?page=` param against the real row count and hands back
 * everything a Prisma query and the pager need.
 */
export function paginate(requestedPage: string | undefined, total: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requested = Math.max(1, Number.parseInt(requestedPage ?? "1", 10) || 1);
  const page = Math.min(requested, pageCount);
  return { page, pageCount, skip: (page - 1) * pageSize, take: pageSize };
}
