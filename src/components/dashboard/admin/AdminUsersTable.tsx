"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatOrderDate } from "@/lib/dashboard/orderDisplay";
import { setUserRole } from "@/app/dashboard/admin/users/actions";
import { DiscordTag } from "@/components/dashboard/DiscordTag";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { isOnline } from "@/lib/accountPresence";

export interface AdminUserRow {
  id: string;
  accountNo: number;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  createdAt: number;
  teammateName: string | null;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
  storeCreditCents?: number;
  teammateBalanceEUR?: number;
  lastSeenAt?: number | null;
  /** Null when the account has no roster profile. */
  teammateAvailable?: boolean | null;
  bannedAt?: number | null;
}

/**
 * What the status column says, which depends on what the account is.
 *
 * A teammate's pill answers whether the dispatcher may send them an order —
 * that is a switch they set, and "ready" is the word for it. A customer has
 * no such switch, so theirs answers the only question worth asking about
 * them: are they here right now. Showing "unavailable" against a customer
 * said neither, and read as though something were wrong with the account.
 */
function statusFor(user: AdminUserRow): { label: string; tone: string } {
  if (user.bannedAt) return { label: "banned", tone: "dashboard-pill--danger" };
  if (user.teammateAvailable !== null && user.teammateAvailable !== undefined) {
    return user.teammateAvailable
      ? { label: "ready", tone: "dashboard-pill--success" }
      : { label: "unavailable", tone: "dashboard-pill--muted" };
  }
  return isOnline(user.lastSeenAt)
    ? { label: "online", tone: "dashboard-pill--success" }
    : { label: "offline", tone: "dashboard-pill--muted" };
}

export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const [pending, startTransition] = useTransition();
  const [roleChange, setRoleChange] = useState<{
    user: AdminUserRow;
    role: "ADMIN" | "TEAMMATE" | "CLIENT";
  } | null>(null);
  const [openRoleMenu, setOpenRoleMenu] = useState<string | null>(null);
  const roles = ["ADMIN", "TEAMMATE", "CLIENT"] as const;

  if (users.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-user-slash" aria-hidden="true" />
        <p>No accounts yet.</p>
      </div>
    );
  }

  return (
    <>
    <table className="dashboard-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Email</th>
          <th>Discord</th>
          <th>Joined</th>
          <th>Role</th>
          <th>Balance</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td className="dashboard-table__no">#{u.accountNo}</td>
            <td className="dashboard-table__primary">
              <Link href={`/dashboard/admin/accounts/${u.accountNo}`} className="dashboard-table__link">
                <span className="admin-list-identity"><span className="admin-list-avatar"><SafeAvatarImage src={u.avatarUrl} /></span><span>{u.teammateName ?? u.name ?? "—"}</span></span>
              </Link>
            </td>
            <td>{u.email}</td>
            <td>
              <DiscordTag discordId={u.discordId} discordUsername={u.discordUsername} discordAvatar={u.discordAvatar} />
            </td>
            <td>{formatOrderDate(u.createdAt)}</td>
            <td>
              <div className={`admin-role-select ${openRoleMenu === u.id ? "is-open" : ""}`}>
                <button type="button" className="admin-role-select__trigger" disabled={pending} aria-haspopup="listbox" aria-expanded={openRoleMenu === u.id} onClick={() => setOpenRoleMenu((current) => current === u.id ? null : u.id)}><span className={`admin-role-select__dot admin-role-select__dot--${u.role.toLowerCase()}`} /><span>{u.role.toLowerCase()}</span><i className="fa-solid fa-chevron-down" aria-hidden="true" /></button>
                {openRoleMenu === u.id ? <div className="admin-role-select__menu" role="listbox" aria-label={`Role for ${u.name ?? u.email}`}>{roles.map((role) => <button key={role} type="button" role="option" aria-selected={role === u.role} className={role === u.role ? "is-selected" : ""} onClick={() => { setOpenRoleMenu(null); if (role !== u.role) setRoleChange({ user: u, role }); }}><span className={`admin-role-select__dot admin-role-select__dot--${role.toLowerCase()}`} />{role.toLowerCase()}{role === u.role ? <i className="fa-solid fa-check" aria-hidden="true" /> : null}</button>)}</div> : null}
              </div>
            </td>
            <td><span className={`admin-user-balance admin-user-balance--${u.role === "TEAMMATE" ? "earned" : "credit"}`}><span className="admin-user-balance__icon"><i className={`fa-solid ${u.role === "TEAMMATE" ? "fa-coins" : "fa-wallet"}`} /></span><span className="admin-user-balance__copy"><strong>€{((u.role === "TEAMMATE" ? u.teammateBalanceEUR ?? 0 : (u.storeCreditCents ?? 0) / 100)).toFixed(2)}</strong><small>{u.role === "TEAMMATE" ? "Earnings" : "Store credit"}</small></span></span></td>
            <td>
              {(() => {
                const status = statusFor(u);
                return <span className={`dashboard-pill ${status.tone}`}>{status.label}</span>;
              })()}
            </td>
            <td>
              <Link href={`/dashboard/admin/accounts/${u.accountNo}`} className="btn btn--ghost btn--sm">
                <i className="fa-solid fa-eye" aria-hidden="true" /> View
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {roleChange ? (
      <div className="dispatch-modal__backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) setRoleChange(null); }}>
        <section className="dispatch-modal admin-role-modal" role="dialog" aria-modal="true" aria-labelledby="admin-role-modal-title">
          <div className="dispatch-modal__head">
            <div>
              <div className="dispatch-modal__eyebrow">Account permissions</div>
              <h2 className="dispatch-modal__title" id="admin-role-modal-title">Change user role?</h2>
            </div>
            <button type="button" className="dispatch-modal__close" aria-label="Close" disabled={pending} onClick={() => setRoleChange(null)}><i className="fa-solid fa-xmark" /></button>
          </div>
          <p className="dispatch-modal__lead">Confirm the new access level for <strong>{roleChange.user.teammateName ?? roleChange.user.name ?? roleChange.user.email}</strong>.</p>
          <div className="admin-role-modal__change"><span>{roleChange.user.role.toLowerCase()}</span><i className="fa-solid fa-arrow-right" aria-hidden="true" /><strong>{roleChange.role.toLowerCase()}</strong></div>
          <p className="dispatch-modal__note">Changing the role immediately updates which dashboard and permissions this account can use.</p>
          <div className="dispatch-modal__actions">
            <button type="button" className="btn btn--ghost" disabled={pending} onClick={() => setRoleChange(null)}>Cancel</button>
            <button type="button" className="btn btn--primary" disabled={pending} onClick={() => startTransition(async () => { await setUserRole(roleChange.user.id, roleChange.role); setRoleChange(null); })}>{pending ? "Updating..." : "Confirm role"}</button>
          </div>
        </section>
      </div>
    ) : null}
    </>
  );
}
