"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptHandoverAction, declineHandoverAction } from "@/app/dashboard/teammate/handoverActions";

/**
 * The two buttons, and what to say when the answer arrives too late.
 *
 * Both outcomes are terminal, so the buttons lock on the first click: the
 * server settles a double accept correctly either way, but a second click
 * that comes back "no longer open" reads as a failure when the first one
 * actually worked.
 */
export function HandoverDecision({ token }: { token: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [declined, setDeclined] = useState(false);

  async function accept() {
    setBusy("accept");
    setError(null);
    const result = await acceptHandoverAction(token);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    router.push(`/dashboard/teammate/session/${result.orderId}`);
  }

  async function decline() {
    setBusy("decline");
    setError(null);
    const result = await declineHandoverAction(token);
    if (!result.ok) {
      setError(result.error);
      setBusy(null);
      return;
    }
    setDeclined(true);
  }

  if (declined) {
    return (
      <>
        <p>Declined. It stays with the teammate who offered it.</p>
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => router.push("/dashboard/teammate")}>
          Back to your panel
        </button>
      </>
    );
  }

  return (
    <>
      {error ? <p className="join-card__dead-reason">{error}</p> : null}
      <div className="cancel-confirm__actions">
        <button type="button" className="btn btn--ghost btn--block" onClick={() => void decline()} disabled={busy !== null}>
          {busy === "decline" ? "Declining..." : "Decline"}
        </button>
        <button type="button" className="btn btn--vivid btn--block" onClick={() => void accept()} disabled={busy !== null}>
          {busy === "accept" ? "Taking it..." : "Accept session"}
        </button>
      </div>
    </>
  );
}
