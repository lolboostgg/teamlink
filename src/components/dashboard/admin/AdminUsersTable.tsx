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
  const [roleDrafts, setRoleDrafts] = useState<Record<string, "ADMIN" | "TEAMMATE" | "CLIENT">>({});

  if (users.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-user-slash" aria-hidden="true" />
        <p>No accounts yet.</p>
      </div>
    );
  }

  return (
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
              <div className="admin-role-picker"><select value={roleDrafts[u.id] ?? u.role} onChange={(event) => setRoleDrafts((current) => ({ ...current, [u.id]: event.target.value as "ADMIN" | "TEAMMATE" | "CLIENT" }))}><option value="ADMIN">Admin</option><option value="TEAMMATE">Teammate</option><option value="CLIENT">Client</option></select><button type="button" className="btn btn--ghost btn--sm" disabled={pending || !roleDrafts[u.id] || roleDrafts[u.id] === u.role} onClick={() => startTransition(async () => { const nextRole = roleDrafts[u.id]; if (!nextRole) return; await setUserRole(u.id, nextRole); setRoleDrafts((current) => { const next = { ...current }; delete next[u.id]; return next; }); })}>Confirm</button></div>
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
  );
}
