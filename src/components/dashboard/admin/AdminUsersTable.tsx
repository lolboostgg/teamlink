"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatOrderDate } from "@/lib/dashboard/orderDisplay";
import { promoteToTeammate, demoteToClient } from "@/app/dashboard/admin/users/actions";
import { DiscordTag } from "@/components/dashboard/DiscordTag";

export interface AdminUserRow {
  id: string;
  accountNo: number;
  email: string;
  name: string | null;
  role: string;
  createdAt: number;
  teammateName: string | null;
  discordId: string | null;
  discordUsername: string | null;
  discordAvatar: string | null;
}

const ROLE_PILL: Record<string, string> = {
  ADMIN: "dashboard-pill--warning",
  TEAMMATE: "dashboard-pill--success",
  CLIENT: "dashboard-pill--muted",
};

export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const [pending, startTransition] = useTransition();
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  function startPromote(user: AdminUserRow) {
    setPromotingId(user.id);
    setNameDraft(user.name ?? user.email.split("@")[0]);
  }

  function confirmPromote(userId: string) {
    const name = nameDraft.trim();
    if (!name) return;
    startTransition(async () => {
      await promoteToTeammate(userId, name);
      setPromotingId(null);
    });
  }

  function handleDemote(userId: string) {
    startTransition(() => demoteToClient(userId));
  }

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
          <th />
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td className="dashboard-table__no">#{u.accountNo}</td>
            <td className="dashboard-table__primary">
              <Link href={`/dashboard/admin/accounts/${u.accountNo}`} className="dashboard-table__link">
                {u.teammateName ?? u.name ?? "—"}
              </Link>
            </td>
            <td>{u.email}</td>
            <td>
              <DiscordTag discordId={u.discordId} discordUsername={u.discordUsername} discordAvatar={u.discordAvatar} />
            </td>
            <td>{formatOrderDate(u.createdAt)}</td>
            <td>
              <span className={`dashboard-pill ${ROLE_PILL[u.role] ?? "dashboard-pill--muted"}`}>
                {u.role.toLowerCase()}
              </span>
            </td>
            <td>
              {u.role === "CLIENT" &&
                (promotingId === u.id ? (
                  <div className="admin-users-table__promote-form">
                    <input
                      className="admin-users-table__promote-input"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      placeholder="Display name"
                      autoFocus
                    />
                    <button type="button" className="btn btn--vivid btn--sm" disabled={pending} onClick={() => confirmPromote(u.id)}>
                      Confirm
                    </button>
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => setPromotingId(null)}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => startPromote(u)}>
                    Make teammate
                  </button>
                ))}
              <Link href={`/dashboard/admin/accounts/${u.accountNo}`} className="btn btn--ghost btn--sm">
                <i className="fa-solid fa-eye" aria-hidden="true" /> View
              </Link>{" "}
              {u.role === "TEAMMATE" && (
                <button type="button" className="btn btn--ghost btn--sm" disabled={pending} onClick={() => handleDemote(u.id)}>
                  Make client
                </button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
