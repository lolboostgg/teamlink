"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// Real replacement for the old hardcoded "you are Nova" demo identity —
// resolves the signed-in account's actual Teammate.id via /api/me/teammate
// so the teammate dashboard (incoming invites, active sessions, reviews,
// chat) reflects whichever real teammate is logged in. Returns null while
// resolving or if this account has no linked Teammate row; callers should
// treat null the same as "nothing to show yet", same as every other
// hydration-gated hook in this codebase.
export function useCurrentTeammateId(): string | null {
  const { data: session, status } = useSession();
  const [teammateId, setTeammateId] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "TEAMMATE") {
      // Resets on logout/role change, not just the initial mount (which is
      // already null) — a real, necessary effect action, not avoidable via
      // lazy initial state alone.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTeammateId(null);
      return;
    }
    let cancelled = false;
    fetch("/api/me/teammate")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { teammateId: string | null } | null) => {
        if (!cancelled) setTeammateId(data?.teammateId ?? null);
      })
      .catch(() => {
        if (!cancelled) setTeammateId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [status, session?.user?.role, session?.user?.id]);

  return teammateId;
}
