import { SupportTicketForm, type TicketOrderOption } from "@/components/dashboard/SupportTicketForm";

/**
 * The reporter's view of their own tickets.
 *
 * Deliberately not the admin view: no assignee, no internal notes, no
 * ownership controls. What somebody who opened a ticket wants to know is
 * where it stands and what came of it, and everything here answers one of
 * those two questions.
 */

export interface SupportTicketRow {
  id: string;
  title: string;
  description: string;
  status: string;
  resolution: string | null;
  resolutionNote: string | null;
  amountEUR: number | null;
  orderId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The stages a ticket moves through, in the order it moves through them. */
const STAGES = [
  { key: "OPEN", label: "Received", icon: "fa-solid fa-inbox" },
  { key: "INVESTIGATING", label: "Investigating", icon: "fa-solid fa-magnifying-glass" },
  { key: "WAITING", label: "Waiting on you", icon: "fa-regular fa-clock" },
  { key: "RESOLVED", label: "Resolved", icon: "fa-solid fa-flag-checkered" },
] as const;

const STATUS_TONE: Record<string, string> = {
  OPEN: "open",
  INVESTIGATING: "investigating",
  WAITING: "waiting",
  RESOLVED: "resolved",
};

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

export function SupportTicketList({ tickets, orders, orderLabels, hint }: {
  tickets: SupportTicketRow[];
  orders: TicketOrderOption[];
  /** Order id → "#1156 · League of Legends", for tickets whose order is
   * older than the picker's list and so isn't in `orders`. */
  orderLabels: Map<string, string>;
  hint: string;
}) {
  return <div className="support-tickets">
    <SupportTicketForm orders={orders} hint={hint} />

    <div className="support-ticket-list">
      <div className="support-ticket-list__head">
        <h2>Your tickets</h2>
        <span>{tickets.length || "No"} {tickets.length === 1 ? "ticket" : "tickets"}</span>
      </div>

      {tickets.length === 0
        ? <div className="support-empty">
            <i className="fa-regular fa-comments" aria-hidden="true" />
            <strong>Nothing open</strong>
            <p>When something goes wrong in a session, open a ticket above and we&apos;ll pick it up.</p>
          </div>
        : tickets.map((ticket) => {
            const tone = STATUS_TONE[ticket.status] ?? "open";
            const resolved = ticket.status === "RESOLVED";
            // A resolved ticket is shown as finished end-to-end rather than
            // lit up to whichever stage it happened to pass through — WAITING
            // sits after INVESTIGATING in the track but a ticket can skip it.
            const reached = resolved ? STAGES.length : STAGES.findIndex((stage) => stage.key === ticket.status) + 1;
            const outcome = ticket.resolution ? RESOLUTION_COPY[ticket.resolution] : null;
            const orderLabel = ticket.orderId ? orderLabels.get(ticket.orderId) : null;

            return <article className={`support-ticket support-ticket--${tone}`} key={ticket.id}>
              <header className="support-ticket__head">
                <span className={`status-badge status-${ticket.status.toLowerCase()}`}>{ticket.status.toLowerCase()}</span>
                {orderLabel && <span className="support-ticket__order"><i className="fa-solid fa-receipt" aria-hidden="true" /> {orderLabel}</span>}
                <time dateTime={ticket.createdAt.toISOString()}>{dateFormat.format(ticket.createdAt)}</time>
              </header>

              <h3 className="support-ticket__title">{ticket.title}</h3>
              <p className="support-ticket__body">{ticket.description}</p>

              <ol className="support-track" aria-label="Ticket progress">
                {STAGES.map((stage, index) => {
                  // WAITING only earns a slot in the track once the ticket has
                  // actually been put there; on every other ticket it is a
                  // stage that never happens and just makes the row longer.
                  if (stage.key === "WAITING" && ticket.status !== "WAITING") return null;
                  const done = index < reached;
                  const current = stage.key === ticket.status;
                  return <li key={stage.key} className={`support-track__step${done ? " is-done" : ""}${current ? " is-current" : ""}`}>
                    <i className={stage.icon} aria-hidden="true" />
                    <span>{stage.label}</span>
                  </li>;
                })}
              </ol>

              {resolved && outcome && <div className={`support-outcome support-outcome--${outcome.tone}`}>
                <div className="support-outcome__head">
                  <i className={outcome.icon} aria-hidden="true" />
                  <strong>{outcome.label}</strong>
                  {ticket.amountEUR !== null && ticket.amountEUR > 0 && <span className="support-outcome__amount">€{ticket.amountEUR.toFixed(2)}</span>}
                </div>
                <p>{outcome.blurb}</p>
                {ticket.resolutionNote && <blockquote>{ticket.resolutionNote}</blockquote>}
              </div>}

              {ticket.status === "WAITING" && <div className="support-outcome support-outcome--waiting">
                <div className="support-outcome__head">
                  <i className="fa-solid fa-reply" aria-hidden="true" />
                  <strong>We need something from you</strong>
                </div>
                <p>Support has asked a question about this ticket. Check your email or Discord and reply there so we can keep going.</p>
              </div>}
            </article>;
          })}
    </div>
  </div>;
}
