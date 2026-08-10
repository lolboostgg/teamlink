import Link from "next/link";
import { GameMark } from "@/components/dashboard/GameMark";
import { DiscordTag } from "@/components/dashboard/DiscordTag";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";

export interface AdminTeammateRow {
  id: string;
  teammateNo: number;
  /** Null for legacy roster rows that were never linked to a real account. */
  accountNo: number | null;
  name: string;
  avatarUrl: string | null;
  email: string | null;
  gameSlugs: string[];
  available: boolean;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  balanceEUR: number;
  bannedAt: number | null;
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
          <th>Discord</th>
          <th>Games</th>
          <th>Balance</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {teammates.map((t) => {
          const visibleGames = t.gameSlugs.slice(0, 6);
          const hiddenGames = t.gameSlugs.length - visibleGames.length;
          return (
          <tr key={t.id}>
            <td className="dashboard-table__no">#{t.teammateNo}</td>
            <td className="dashboard-table__primary">
              <Link href={`/dashboard/admin/teammates/${t.teammateNo}`} className="dashboard-table__link">
                <span className="admin-list-identity"><span className="admin-list-avatar"><SafeAvatarImage src={t.avatarUrl} /></span><span>{t.name}</span></span>
              </Link>
            </td>
            <td>{t.email ?? "—"}</td>
            <td>
              <DiscordTag discordId={t.discordId} discordUsername={t.discordUsername} discordAvatar={t.discordAvatar} />
            </td>
            <td>
              {t.gameSlugs.length ? (
                <span className="game-mark-stack game-mark-stack--compact" aria-label={`${t.gameSlugs.length} games`}>
                  {visibleGames.map((slug) => (
                    <GameMark key={slug} slug={slug} size={23} />
                  ))}
                  {hiddenGames > 0 && <span className="game-mark-more" title={`${hiddenGames} more games`}>+{hiddenGames}</span>}
                </span>
              ) : (
                "—"
              )}
            </td>
            <td><span className="admin-user-balance admin-user-balance--earned"><span className="admin-user-balance__icon"><i className="fa-solid fa-coins" /></span><span className="admin-user-balance__copy"><strong>€{t.balanceEUR.toFixed(2)}</strong><small>Earnings</small></span></span></td>
            <td>
              {/* "ready", not "available": this column answers whether the
                  dispatcher may send them an order, and "available" reads as
                  a fact about the person rather than a switch they set. */}
              <span className={`dashboard-pill ${t.bannedAt ? "dashboard-pill--danger" : t.available ? "dashboard-pill--success" : "dashboard-pill--muted"}`}>
                {t.bannedAt ? "banned" : t.available ? "ready" : "unavailable"}
              </span>
            </td>
            <td>
              <Link href={`/dashboard/admin/teammates/${t.teammateNo}`} className="btn btn--ghost btn--sm">
                <i className="fa-solid fa-eye" aria-hidden="true" /> View
              </Link>
            </td>
          </tr>
          );
        })}
      </tbody>
    </table>
  );
}
