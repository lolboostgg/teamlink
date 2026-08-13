"use client";

import { useActionState, useState, useTransition } from "react";
import { replyToTicket, closeOwnTicket, type TicketFormState } from "@/app/dashboard/disputes/actions";

/**
 * Replying to and closing your own ticket.
 *
 * Both live on the same card and both are the reporter acting on their own
 * ticket, so they share a component and a piece of feedback — an error from
 * either shows in one place instead of two boxes that can disagree.
 */
export function SupportTicketActions({ ticketId, solved }: { ticketId: string; solved: boolean }) {
  const [body, setBody] = useState("");
  const [closing, startClosing] = useTransition();
  const [closeError, setCloseError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [state, submit, sending] = useActionState(async (previous: TicketFormState, formData: FormData) => {
    const result = await replyToTicket(previous, formData);
    if (result.ok) setBody("");
    return result;
  }, {});

  function close() {
    setCloseError(null);
    startClosing(async () => {
      const result = await closeOwnTicket(ticketId);
      if (result.error) setCloseError(result.error);
      else setConfirming(false);
    });
  }

  return <div className="ticket-actions">
    <form action={submit} className="ticket-reply">
      <input type="hidden" name="ticketId" value={ticketId} />
      <textarea
        name="body"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        maxLength={3000}
        rows={2}
        placeholder={solved ? "Still not right? Reply and we'll reopen it." : "Add a message for support…"}
        className="ticket-reply__input"
      />
      <div className="ticket-reply__row">
        <button className="btn btn--vivid btn--sm" disabled={sending || !body.trim()}>
          {sending ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Sending…</> : <><i className="fa-solid fa-paper-plane" aria-hidden="true" /> {solved ? "Reply & reopen" : "Send"}</>}
        </button>

        {/* Two clicks, because closing is the reporter telling us to stop —
            an admin may already be working on it, and a mis-click that ends
            that quietly is worse than one extra button. */}
        {!solved && (confirming
          ? <span className="ticket-actions__confirm">
              <span>Close this ticket?</span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={close} disabled={closing}>
                {closing ? "Closing…" : "Yes, close it"}
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirming(false)} disabled={closing}>Keep it open</button>
            </span>
          : <button type="button" className="btn btn--ghost btn--sm ticket-actions__close" onClick={() => setConfirming(true)}>
              <i className="fa-solid fa-check" aria-hidden="true" /> Close ticket
            </button>)}
      </div>
    </form>

    {(state.error || closeError) && <p className="support-ticket-form__error" role="alert">
      <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {state.error ?? closeError}
    </p>}
  </div>;
}
