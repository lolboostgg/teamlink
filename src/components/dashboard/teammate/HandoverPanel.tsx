"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/ToastProvider";
import { createHandoverAction } from "@/app/dashboard/teammate/handoverActions";

/**
 * Minting the link that passes this session to somebody else.
 *
 * Folded away behind a disclosure rather than sitting open: handing an order
 * over is the rare case, and a visible "give this away" button next to the
 * session controls is one misclick from a teammate losing an order they
 * wanted. Opening it is the deliberate act; the link itself is harmless
 * until sent.
 */
export function HandoverPanel({ orderId }: { orderId: string }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function mint() {
    setBusy(true);
    const result = await createHandoverAction(orderId, note);
    setBusy(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    // The action returns a path; the origin is the browser's own, which is
    // the one thing here guaranteed to be right.
    const absolute = `${window.location.origin}${result.url}`;
    setLink(absolute);
    setExpiresAt(result.expiresAt);
    try {
      await navigator.clipboard.writeText(absolute);
      showToast("Handover link copied", "success");
    } catch {
      // Clipboard access is refused in plenty of ordinary situations. The
      // link is on screen and selectable, so this is not worth an error.
      showToast("Handover link ready", "success");
    }
  }

  if (!open) {
    return (
      <div className="order-room__handover">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(true)}>
          <i className="fa-solid fa-people-arrows" aria-hidden="true" /> Hand this session to someone else
        </button>
      </div>
    );
  }

  return (
    <div className="order-room__handover is-open">
      <p className="order-room__handover-lead">
        Creates a link that gives this order to whoever opens it and accepts. They have to be cleared for the game and
        rank, and the link lasts 30 minutes. Making a new one cancels the old.
      </p>

      <label className="support-field">
        <span className="support-field__label">Who is it for? <small>Only you see this</small></span>
        <input
          className="support-field__input"
          type="text"
          value={note}
          maxLength={120}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. Marv — customer asked for him"
        />
      </label>

      {link ? (
        <div className="order-room__handover-link">
          <code>{link}</code>
          {expiresAt ? (
            <small>Valid until {new Date(expiresAt).toLocaleTimeString()}</small>
          ) : null}
        </div>
      ) : null}

      <div className="order-room__handover-actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen(false)}>
          Close
        </button>
        <button type="button" className="btn btn--vivid btn--sm" onClick={() => void mint()} disabled={busy}>
          {busy ? "Creating..." : link ? "Create a new link" : "Create handover link"}
        </button>
      </div>
    </div>
  );
}
