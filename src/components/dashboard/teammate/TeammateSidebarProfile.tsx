"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { setOnlineAction } from "@/app/dashboard/teammate/dispatchActions";
import { useToast } from "@/components/ui/ToastProvider";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";

export type TeammateSidebarData = {
  name: string;
  avatarUrl: string | null;
  avatarFocusX: number;
  avatarFocusY: number;
  avatarZoom: number;
  rating: number;
  sessionsCount: number;
  available: boolean;
  balanceEUR: number;
};

export function TeammateSidebarProfile({ teammate }: { teammate: TeammateSidebarData }) {
  const { showToast } = useToast();
  const [online, setOnline] = useState(teammate.available);
  const [pending, startTransition] = useTransition();

  function toggleOnline() {
    const next = !online;
    startTransition(async () => {
      const result = await setOnlineAction(next);
      if (!result.ok) {
        showToast(result.error, "error");
        return;
      }
      setOnline(next);
      showToast(next ? "You're online — new orders can reach you." : "You're offline.", "info");
    });
  }

  return (
    <section className={`teammate-sidebar-profile${online ? " is-online" : ""}`} aria-label="Teammate status">
      <Link href="/dashboard/teammate/profile" className="teammate-sidebar-profile__identity" title={teammate.name}>
        <span className="teammate-sidebar-profile__avatar">
          <SafeAvatarImage src={teammate.avatarUrl} frame={teammate} />
          <span className="teammate-sidebar-profile__presence" aria-hidden="true" />
        </span>
        <span className="teammate-sidebar-profile__name">{teammate.name}</span>
      </Link>

      <div className="teammate-sidebar-profile__stats">
        <span><small>Rating</small><strong><i className="fa-solid fa-star" /> {teammate.rating.toFixed(1)}</strong></span>
        <span><small>Sessions</small><strong>{teammate.sessionsCount}</strong></span>
      </div>

      <button
        type="button"
        className="teammate-sidebar-profile__toggle"
        onClick={toggleOnline}
        disabled={pending}
        aria-pressed={online}
        title={online ? "Go offline" : "Go online"}
      >
        <span>{pending ? "Updating…" : online ? "Online" : "Go Online"}</span>
        <i aria-hidden="true"><b /></i>
      </button>
    </section>
  );
}
