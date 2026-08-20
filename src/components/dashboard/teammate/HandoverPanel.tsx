"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { createHandoverAction } from "@/app/dashboard/teammate/handoverActions";

/**
 * Passing this session to somebody else.
 *
 * A card that opens a dialog, rather than a section that expands in place.
 * The order room's right-hand column is a two-row grid whose second row —
 * the chat — takes whatever the session panel leaves, and the chat clips its
 * overflow rather than scrolling it. An expanding panel there therefore ate
 * the conversation. So the card lives in the left column, which scrolls on
 * its own, and the form it opens is an overlay, which costs the layout
 * nothing at all.
 */
export function HandoverPanel({ orderId }: { orderId: string }) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      showToast("Handover link copied", "success");
    } catch {
      // Clipboard access is refused in plenty of ordinary situations. The
      // link is on screen and selectable, so this is not worth an error.
      showToast("Handover link ready — copy it below", "success");
    }
  }

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
    void copy(absolute);
  }

  function close() {
    setOpen(false);
    // Deliberately kept: reopening should show the link that is still live
    // rather than looking like nothing ever happened. Only a new link
    // replaces it, and doing that is what puts the old one out.
  }

  return (
    <>
      <button type="button" className="handover-card" onClick={() => setOpen(true)}>
        <span className="handover-card__icon" aria-hidden="true">
          <i className="fa-solid fa-people-arrows" />
        </span>
        <span className="handover-card__text">
          <strong>Give this session to someone else</strong>
          <small>
            {link
              ? "A handover link is live for this order"
              : "Create a link for the teammate the customer asked for"}
          </small>
        </span>
        <i className="fa-solid fa-chevron-right handover-card__chevron" aria-hidden="true" />
      </button>

      <Modal open={open} onClose={close} labelledBy="handover-modal-title">
        <div className="handover-modal">
          <span className="modal-icon modal-icon--accent" aria-hidden="true">
            <i className="fa-solid fa-people-arrows" />
          </span>
          <h2 id="handover-modal-title" className="cancel-confirm__title">
            Hand this session over
          </h2>
          <p className="cancel-confirm__sub">
            This makes a link that gives the order to whoever opens it and accepts. They have to be cleared for the game
            and the rank, and the link lasts 30 minutes. Creating a new one cancels the old.
          </p>

          <label className="support-field">
            <span className="support-field__label">
              Who is it for? <small>Only you see this</small>
            </span>
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
            <div className="handover-modal__link">
              <code>{link}</code>
              <div className="handover-modal__link-foot">
                {expiresAt ? <small>Valid until {new Date(expiresAt).toLocaleTimeString()}</small> : <span />}
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => void copy(link)}>
                  <i className="fa-regular fa-copy" aria-hidden="true" /> Copy
                </button>
              </div>
            </div>
          ) : null}

          <div className="cancel-confirm__actions">
            <button type="button" className="btn btn--ghost btn--block" onClick={close}>
              Close
            </button>
            <button type="button" className="btn btn--vivid btn--block" onClick={() => void mint()} disabled={busy}>
              {busy ? "Creating..." : link ? "Create a new link" : "Create link"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
