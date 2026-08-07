"use client";

import { useEffect, useRef } from "react";
import { PriceTag } from "@/components/currency/PriceTag";

/**
 * A customer asking to cancel is the one thing in the order room that stops
 * the session dead, so it interrupts rather than waiting to be noticed in a
 * strip above the panels.
 */
export function CancelRequestModal({
  customerName,
  refundEUR,
  pending,
  onApprove,
  onDecline,
}: {
  customerName: string;
  refundEUR?: number | null;
  pending: boolean;
  onApprove: () => void;
  onDecline: () => void;
}) {
  const chimed = useRef(false);

  // Synthesised rather than an audio file: two short tones need no asset,
  // no preloading and no autoplay-blocked <audio> element. Wrapped because
  // a browser that refuses to start an AudioContext without a prior gesture
  // must not take the modal down with it.
  useEffect(() => {
    if (chimed.current) return;
    chimed.current = true;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const at = ctx.currentTime;
      [
        [0, 660],
        [0.17, 520],
      ].forEach(([offset, freq]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, at + offset);
        gain.gain.exponentialRampToValueAtTime(0.12, at + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + offset + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start(at + offset);
        osc.stop(at + offset + 0.16);
      });
      window.setTimeout(() => void ctx.close(), 900);
    } catch {
      // No sound is fine; the modal is the alert that matters.
    }
  }, []);

  return (
    <div
      className="dispatch-modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-request-title"
    >
      <div className="dispatch-modal cancel-modal">
        <span className="cancel-modal__icon" aria-hidden="true">
          <i className="fa-solid fa-circle-exclamation" />
        </span>

        <div className="cancel-modal__eyebrow">Cancellation request</div>
        <h2 className="cancel-modal__title" id="cancel-request-title">
          {customerName} wants to cancel
        </h2>
        <p className="cancel-modal__sub">
          The session is paused until you answer, so please pick one now.
        </p>

        <div className="cancel-modal__outcomes">
          <div className="cancel-modal__outcome">
            <i className="fa-solid fa-check" aria-hidden="true" />
            <span>
              <strong>Approve</strong>
              <small>
                Ends the session
                {refundEUR != null ? (
                  <>
                    {" "}
                    and returns <PriceTag amountEUR={refundEUR} /> to their credits
                  </>
                ) : (
                  " and refunds them to credits"
                )}
                . You keep nothing for it.
              </small>
            </span>
          </div>
          <div className="cancel-modal__outcome">
            <i className="fa-solid fa-play" aria-hidden="true" />
            <span>
              <strong>Decline</strong>
              <small>Carries on exactly where you left off — nothing is refunded.</small>
            </span>
          </div>
        </div>

        <div className="cancel-modal__actions">
          <button type="button" className="btn btn--ghost btn--block" disabled={pending} onClick={onDecline}>
            Decline
          </button>
          <button type="button" className="btn btn--danger btn--block" disabled={pending} onClick={onApprove}>
            {pending ? "Saving…" : "Approve cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}
