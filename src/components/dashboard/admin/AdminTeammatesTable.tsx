import Link from "next/link";
import { GameMark } from "@/components/dashboard/GameMark";

export interface AdminTeammateRow {
  id: string;
  teammateNo: number;
  /** Null for legacy roster rows that were never linked to a real account. */
  accountNo: number | null;
  name: string;
  email: string | null;
  gameSlugs: string[];
  available: boolean;
}

// Editing moved out of a modal and onto the teammate profile page
// (/dashboard/admin/teammates/[no]), so this is a plain server-rendered list.
export function AdminTeammatesTable({ teammates }: { teammates: AdminTeammateRow[] }) {
  if (teammates.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-user-slash" aria-hidden="true" />
        <p>No teammates yet — promote a client from the Users page.</p>
      </div>
    );
  }

  return (
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Account</th>
          <th>Games</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {teammates.map((t) => (
          <tr key={t.id}>
            <td className="dashboard-table__no">#{t.teammateNo}</td>
            <td className="dashboard-table__primary">
              <Link href={`/dashboard/admin/teammates/${t.teammateNo}`} className="dashboard-table__link">
                {t.name}
              </Link>
            </td>
            <td>{t.email ?? "—"}</td>
            <td>
              {t.gameSlugs.length ? (
                <span className="game-mark-stack">
                  {t.gameSlugs.map((slug) => (
                    <GameMark key={slug} slug={slug} size={26} />
                  ))}
                </span>
              ) : (
                "—"
              )}
            </td>
            <td>
              <span className={`dashboard-pill ${t.available ? "dashboard-pill--success" : "dashboard-pill--muted"}`}>
                {t.available ? "available" : "unavailable"}
              </span>
            </td>
            <td>
              <Link href={`/dashboard/admin/teammates/${t.teammateNo}`} className="btn btn--ghost btn--sm">
                <i className="fa-solid fa-eye" aria-hidden="true" /> View
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
