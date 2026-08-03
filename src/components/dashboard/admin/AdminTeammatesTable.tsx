"use client";

import { useState } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { TeammateProfileForm, type TeammateProfileFormValue } from "@/components/dashboard/TeammateProfileForm";
import { GAMES } from "@/lib/games";
import { updateTeammateProfile } from "@/app/dashboard/admin/teammates/actions";
import type { LanguageCode } from "@/lib/i18n";
import type { GameProfileMap } from "@/lib/gameProfiles";

export interface AdminTeammateRow {
  id: string;
  teammateNo: number;
  /** Null for legacy roster rows that were never linked to a real account. */
  accountNo: number | null;
  name: string;
  email: string | null;
  tagline: string;
  timezone: string;
  avatarUrl: string | null;
  languages: string[];
  gameSlugs: string[];
  gameProfiles: GameProfileMap;
  available: boolean;
}

const GAME_NAME_BY_SLUG = new Map(GAMES.map((g) => [g.slug, g.shortName]));

export function AdminTeammatesTable({ teammates }: { teammates: AdminTeammateRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = teammates.find((t) => t.id === editingId) ?? null;

  if (teammates.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-user-slash" aria-hidden="true" />
        <p>No teammates yet — promote a client from the Users page.</p>
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
                {t.accountNo ? (
                  <Link href={`/dashboard/admin/accounts/${t.accountNo}`} className="dashboard-table__link">
                    {t.name}
                  </Link>
                ) : (
                  t.name
                )}
              </td>
              <td>{t.email ?? "—"}</td>
              <td>{t.gameSlugs.length ? t.gameSlugs.map((s) => GAME_NAME_BY_SLUG.get(s) ?? s).join(", ") : "—"}</td>
              <td>
                <span className={`dashboard-pill ${t.available ? "dashboard-pill--success" : "dashboard-pill--muted"}`}>
                  {t.available ? "available" : "unavailable"}
                </span>
              </td>
              <td>
                {t.accountNo ? (
                  <Link href={`/dashboard/admin/accounts/${t.accountNo}`} className="btn btn--ghost btn--sm">
                    <i className="fa-solid fa-eye" aria-hidden="true" /> View
                  </Link>
                ) : (
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditingId(t.id)}>
                    Edit profile
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Modal open={editing !== null} onClose={() => setEditingId(null)} labelledBy="edit-teammate-title">
        {editing && (
          <div className="teammate-profile-modal">
            <h2 id="edit-teammate-title" className="teammate-profile-modal__title">
              Edit {editing.name}
            </h2>
            <TeammateProfileForm
              showAdminFields
              initial={{
                name: editing.name,
                tagline: editing.tagline,
                timezone: editing.timezone,
                avatarUrl: editing.avatarUrl ?? "",
                languages: editing.languages as LanguageCode[],
                gameSlugs: editing.gameSlugs,
                gameProfiles: editing.gameProfiles,
              }}
              onCancel={() => setEditingId(null)}
              onSave={async (value: TeammateProfileFormValue) => {
                await updateTeammateProfile(editing.id, value);
                setEditingId(null);
              }}
            />
          </div>
        )}
      </Modal>
    </>
  );
}
