"use client";

import { useIncomingDispatches } from "@/lib/matchmaking/useIncomingDispatches";

export function PendingInvitesBanner() {
  const { pendingInvites } = useIncomingDispatches();

  if (pendingInvites.length === 0) return null;

  return (
    <a href="/dashboard/teammate/sessions" className="dispatch-banner">
      <i className="fa-solid fa-bolt" aria-hidden="true" />
      {pendingInvites.length === 1
        ? "You have a live match request waiting"
        : `You have ${pendingInvites.length} live match requests waiting`}
      <span className="dispatch-banner__cta">Respond now →</span>
    </a>
  );
}
