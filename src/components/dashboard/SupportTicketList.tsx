"use client";

import { useState } from "react";
import { SupportTicketForm, type TicketOrderOption } from "@/components/dashboard/SupportTicketForm";
import { SupportTicketActions } from "@/components/dashboard/SupportTicketActions";

/**
 * The reporter's view of their own tickets.
 *
 * Deliberately not the admin view: no assignee, no internal notes, no
 * ownership controls. What somebody who opened a ticket wants to know is
 * where it stands and what came of it, and everything here answers one of
 * those two questions — or lets them say something back.
 *
 * Tickets come first and the form folds away, which is the opposite of how
 * this started. Opening a ticket is something a customer does once; coming
 * back to read the answer is what they do after that, and the form was a
 * screenful of empty fields standing between them and it. It unfolds by
 * itself only when there are no tickets, because then it is the whole page.
 */

export interface SupportTicketMessage {
  id: string;
  body: string;
  authorRole: string;
  createdAt: Date;
}

export interface SupportTicketRow {
  id: string;
  title: string;
  description: string;
  status: string;
  resolution: string | null;
  resolutionNote: string | null;
  amountEUR: number | null;
  closedByReporter: boolean;
  orderId: string | null;
  createdAt: Date;
  updatedAt: Date;
  /** Public messages only — internal notes never reach this component. */
  messages: SupportTicketMessage[];
}

const STAGES = [
  { key: "PENDING", label: "Pending", icon: "fa-solid fa-inbox" },
  { key: "IN_PROGRESS", label: "In progress", icon: "fa-solid fa-magnifying-glass" },
  { key: "SOLVED", label: "Solved", icon: "fa-solid fa-flag-checkered" },
] as const;

const STATUS_LABEL: Record<string, string> = { PENDING: "Pending", IN_PROGRESS: "In progress", SOLVED: "Solved" };

/**
 * What each outcome meant, in the reporter's terms.
 *
 * The database stores an enum an admin picked from; "PARTIAL_REFUND" is not
 * an answer to "what happened to my money", so each one is spelled out.
 */
const RESOLUTION_COPY: Record<string, { label: string; blurb: string; tone: string; icon: string }> = {
  REFUND: { label: "Refunded in full", blurb: "The full amount is on its way back to your original payment method.", tone: "good", icon: "fa-solid fa-rotate-left" },
  PARTIAL_REFUND: { label: "Partially refunded", blurb: "Part of what you paid is on its way back to your original payment method.", tone: "good", icon: "fa-solid fa-rotate-left" },
  CREDIT: { label: "Credited to your balance", blurb: "The amount has been added to your QUP.gg balance and can be spent on your next booking.", tone: "good", icon: "fa-solid fa-wallet" },
  TEAMMATE_NO_SHOW: { label: "No-show confirmed", blurb: "We verified the teammate didn't show up and have taken action on their account.", tone: "good", icon: "fa-solid fa-user-slash" },
  REJECTED: { label: "Not upheld", blurb: "We looked into this and couldn't find grounds to act on it. The reason is below.", tone: "bad", icon: "fa-solid fa-circle-minus" },
  OTHER: { label: "Handled", blurb: "This was resolved outside the standard outcomes. The details are below.", tone: "neutral", icon: "fa-solid fa-circle-info" },
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
const shortFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" });

/** Whether support has said something the customer has not answered. */
function hasUnansweredReply(ticket: SupportTicketRow): boolean {
  const last = ticket.messages[ticket.messages.length - 1];
  return ticket.status !== "SOLVED" && last?.authorRole === "ADMIN";
}

export function SupportTicketList({ tickets, orders, orderLabels, hint }: {
  tickets: SupportTicketRow[];
  orders: TicketOrderOption[];
  /** Order id → "#1156 · League of Legends", for tickets whose order is
   * older than the picker's list and so isn't in `orders`. */
  orderLabels: Map<string, string>;
  hint: string;
}) {
  const [formOpen, setFormOpen] = useState(tickets.length === 0);
  // Open on the ticket that is actually waiting for the customer, and
  // otherwise on nothing: a list of collapsed rows is the point.
  const [openId, setOpenId] = useState<string | null>(tickets.find(hasUnansweredReply)?.id ?? null);
  const open = tickets.filter((ticket) => ticket.status !== "SOLVED").length;

  return <div className="support-tickets">
    <div className="support-tickets__bar">
      <div className="support-tickets__tally">
        <strong>{tickets.length || "No"} {tickets.length === 1 ? "ticket" : "tickets"}</strong>
        {open > 0 && <span>{open} still open</span>}
      </div>
      {tickets.length > 0 && <button type="button" className={`btn btn--sm ${formOpen ? "btn--ghost" : "btn--vivid"}`} onClick={() => setFormOpen((value) => !value)} aria-expanded={formOpen}>
        <i className={`fa-solid ${formOpen ? "fa-xmark" : "fa-plus"}`} aria-hidden="true" /> {formOpen ? "Cancel" : "New ticket"}
      </button>}
    </div>

    {formOpen && <SupportTicketForm orders={orders} hint={hint} />}

    {tickets.length === 0 && !formOpen && <div className="support-empty">
      <i className="fa-regular fa-comments" aria-hidden="true" />
      <strong>Nothing open</strong>
      <p>When something goes wrong in a session, open a ticket and we&apos;ll pick it up.</p>
    </div>}

    <div className="support-ticket-list">
      {tickets.map((ticket) => {
        const solved = ticket.status === "SOLVED";
        const tone = ticket.status.toLowerCase();
        const expanded = openId === ticket.id;
        const waiting = hasUnansweredReply(ticket);
        const reached = STAGES.findIndex((stage) => stage.key === ticket.status) + 1;
        const outcome = ticket.resolution ? RESOLUTION_COPY[ticket.resolution] : null;
        const orderLabel = ticket.orderId ? orderLabels.get(ticket.orderId) : null;

        return <article className={`support-ticket support-ticket--${tone}${expanded ? " is-open" : ""}`} key={ticket.id}>
          {/* The whole row is the control. A collapsed ticket has to say
              enough to be skipped past without opening it: where it stands,
              which order, and whether anybody is waiting on the customer. */}
          <button type="button" className="support-ticket__row" onClick={() => setOpenId(expanded ? null : ticket.id)} aria-expanded={expanded}>
            <span className={`status-badge status-${tone}`}>{STATUS_LABEL[ticket.status] ?? ticket.status}</span>
            <span className="support-ticket__row-main">
              <span className="support-ticket__title">{ticket.title}</span>
              <span className="support-ticket__row-meta">
                {orderLabel && <><i className="fa-solid fa-receipt" aria-hidden="true" /> {orderLabel} · </>}
                {ticket.messages.length + 1} {ticket.messages.length === 0 ? "message" : "messages"}
              </span>
            </span>
            {/* The label sits in its own span so a narrow screen can drop the
                words and keep the icon, rather than losing the signal. */}
            {waiting && <span className="support-ticket__waiting"><i className="fa-solid fa-envelope" aria-hidden="true" /><span>Support replied</span></span>}
            <time dateTime={ticket.updatedAt.toISOString()}>{shortFormat.format(ticket.updatedAt)}</time>
            <i className="fa-solid fa-chevron-down support-ticket__chevron" aria-hidden="true" />
          </button>

          {expanded && <div className="support-ticket__body">
            <ol className="support-track" aria-label="Ticket progress">
              {STAGES.map((stage, index) => <li key={stage.key} className={`support-track__step${index < reached ? " is-done" : ""}${stage.key === ticket.status ? " is-current" : ""}`}>
                <i className={stage.icon} aria-hidden="true" />
                <span>{stage.label}</span>
              </li>)}
            </ol>

            {/* The opening description is the first message in the thread
                rather than a paragraph above it — it is the same thing, and
                splitting them made the reply that answered it look like it
                was answering nothing. */}
            <ol className="ticket-thread">
              <li className="ticket-message ticket-message--mine">
                <div className="ticket-message__meta"><strong>You</strong><time dateTime={ticket.createdAt.toISOString()}>{dateFormat.format(ticket.createdAt)}</time></div>
                <p>{ticket.description}</p>
              </li>
              {ticket.messages.map((message) => {
                const fromSupport = message.authorRole === "ADMIN";
                return <li key={message.id} className={`ticket-message ticket-message--${fromSupport ? "support" : "mine"}`}>
                  <div className="ticket-message__meta">
                    <strong>{fromSupport ? <><i className="fa-solid fa-headset" aria-hidden="true" /> Support</> : "You"}</strong>
                    <time dateTime={message.createdAt.toISOString()}>{dateFormat.format(message.createdAt)}</time>
                  </div>
                  <p>{message.body}</p>
                </li>;
              })}
            </ol>

            {solved && outcome && <div className={`support-outcome support-outcome--${outcome.tone}`}>
              <div className="support-outcome__head">
                <i className={outcome.icon} aria-hidden="true" />
                <strong>{outcome.label}</strong>
                {ticket.amountEUR !== null && ticket.amountEUR > 0 && <span className="support-outcome__amount">€{ticket.amountEUR.toFixed(2)}</span>}
              </div>
              <p>{outcome.blurb}</p>
              {ticket.resolutionNote && <blockquote>{ticket.resolutionNote}</blockquote>}
            </div>}

            {solved && ticket.closedByReporter && <div className="support-outcome support-outcome--neutral">
              <div className="support-outcome__head">
                <i className="fa-solid fa-circle-check" aria-hidden="true" />
                <strong>You closed this ticket</strong>
              </div>
              <p>No refund or credit was issued, because you closed it yourself rather than asking us to settle it. Reply below if it turns out you still need us.</p>
            </div>}

            <SupportTicketActions ticketId={ticket.id} solved={solved} />
          </div>}
        </article>;
      })}
    </div>
  </div>;
}
