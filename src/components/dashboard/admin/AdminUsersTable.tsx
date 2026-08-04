"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatOrderDate } from "@/lib/dashboard/orderDisplay";
import { setUserRole } from "@/app/dashboard/admin/users/actions";
import { DiscordTag } from "@/components/dashboard/DiscordTag";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";

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
}

export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const [pending, startTransition] = useTransition();
  const [roleChange, setRoleChange] = useState<{
    user: AdminUserRow;
    role: "ADMIN" | "TEAMMATE" | "CLIENT";
  } | null>(null);

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
              <div className="admin-role-picker"><select value={u.role} disabled={pending} onChange={(event) => { const role = event.target.value as "ADMIN" | "TEAMMATE" | "CLIENT"; if (role !== u.role) setRoleChange({ user: u, role }); }}><option value="ADMIN">Admin</option><option value="TEAMMATE">Teammate</option><option value="CLIENT">Client</option></select></div>
            </td>
            <td><span className="admin-user-balance"><i className={`fa-solid ${u.role === "TEAMMATE" ? "fa-coins" : "fa-wallet"}`} />€{((u.role === "TEAMMATE" ? u.teammateBalanceEUR ?? 0 : (u.storeCreditCents ?? 0) / 100)).toFixed(2)}<small>{u.role === "TEAMMATE" ? "earned" : "store credit"}</small></span></td>
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
