"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DashboardSelect } from "@/components/dashboard/DashboardSelect";
import { resolveDispute, updateDispute, replyAsAdmin } from "@/app/dashboard/admin/disputes/actions";

/**
 * The support queue.
 *
 * Rebuilt as a list beside a detail panel rather than a column of cards. The
 * card version rendered every ticket's whole conversation and all three of
 * its forms at once, so ten tickets were several thousand pixels of controls
 * for the one ticket anybody was actually working on — and a solved ticket
 * from last week took the same room as the one waiting for a reply. Here the
 * list answers "what needs me", and only the selected ticket is unfolded.
 */

export interface DisputeMessage {
  id: string;
  body: string;
  authorRole: string;
  internal: boolean;
  createdAt: string;
}

export interface DisputeRow {
  id: string;
  title: string;
  description: string;
  status: string;
  openedByRole: string;
  assigneeId: string | null;
  closedByReporter: boolean;
  resolution: string | null;
  resolutionNote: string | null;
  amountEUR: number | null;
  createdAt: string;
  updatedAt: string;
  messages: DisputeMessage[];
  order: { id: string; orderNo: number; gameName: string; status: string; candidates: number; reports: number } | null;
}

export interface AdminOption { id: string; label: string }

const STATUS_LABEL: Record<string, string> = { PENDING: "Pending", IN_PROGRESS: "In progress", SOLVED: "Solved" };
const RESOLUTIONS = ["REFUND", "PARTIAL_REFUND", "CREDIT", "REJECTED", "OTHER", "TEAMMATE_NO_SHOW"];

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });
const timeFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** Who wrote a message, as the admin reading it needs to see it. */
function speaker(role: string): string {
  return role === "ADMIN" ? "Support" : role === "TEAMMATE" ? "Teammate" : "Customer";
}

/**
 * Whether the last thing said on a ticket came from the reporter.
 *
 * The single most useful fact in the whole queue: it is the difference
 * between a ticket that is waiting on us and one that is waiting on them,
 * and no status field can carry it because an admin would have to remember
 * to set it.
 */
function awaitingReply(ticket: DisputeRow): boolean {
  if (ticket.status === "SOLVED") return false;
  const thread = ticket.messages.filter((message) => !message.internal);
  // No replies at all means the opening description is the last word, and
  // that is the reporter's.
  return thread.length === 0 || thread[thread.length - 1].authorRole !== "ADMIN";
}

type Filter = "attention" | "PENDING" | "IN_PROGRESS" | "SOLVED" | "all";

export function DisputeBoard({ tickets, admins }: { tickets: DisputeRow[]; admins: AdminOption[] }) {
  const [filter, setFilter] = useState<Filter>("attention");
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id ?? null);
  const [query, setQuery] = useState("");

  const counts = useMemo(() => ({
    attention: tickets.filter(awaitingReply).length,
    PENDING: tickets.filter((ticket) => ticket.status === "PENDING").length,
    IN_PROGRESS: tickets.filter((ticket) => ticket.status === "IN_PROGRESS").length,
    SOLVED: tickets.filter((ticket) => ticket.status === "SOLVED").length,
    all: tickets.length,
  }), [tickets]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (filter === "attention" ? !awaitingReply(ticket) : filter !== "all" && ticket.status !== filter) return false;
      if (!needle) return true;
      return [ticket.title, ticket.description, ticket.order ? `#${ticket.order.orderNo}` : "", ticket.order?.gameName ?? ""]
        .some((field) => field.toLowerCase().includes(needle));
    });
  }, [tickets, filter, query]);

  // Selection follows the filter rather than emptying the panel: narrowing to
  // "Pending" while a solved ticket was open used to leave the right-hand
  // side showing something the list no longer contained.
  const selected = visible.find((ticket) => ticket.id === selectedId) ?? visible[0] ?? null;

  const FILTERS: { key: Filter; label: string; icon: string }[] = [
    { key: "attention", label: "Needs reply", icon: "fa-solid fa-reply" },
    { key: "PENDING", label: "Pending", icon: "fa-solid fa-inbox" },
    { key: "IN_PROGRESS", label: "In progress", icon: "fa-solid fa-magnifying-glass" },
    { key: "SOLVED", label: "Solved", icon: "fa-solid fa-flag-checkered" },
    { key: "all", label: "All", icon: "fa-solid fa-layer-group" },
  ];

  return <div className="dispute-board">
    <div className="dispute-board__bar">
      <div className="filter-pills__group" role="group" aria-label="Filter tickets">
        {FILTERS.map((option) => <button
          key={option.key}
          type="button"
          className={`filter-pill filter-pill--button${filter === option.key ? " is-active" : ""}`}
          aria-pressed={filter === option.key}
          onClick={() => setFilter(option.key)}
        >
          <i className={option.icon} aria-hidden="true" />
          {option.label}
          <span className="filter-pill__count">{counts[option.key]}</span>
        </button>)}
      </div>
      <label className="dispute-board__search">
        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, order or text…" aria-label="Search tickets" />
      </label>
    </div>

    <div className="dispute-board__split">
      <ol className="dispute-queue" aria-label="Ticket queue">
        {visible.length === 0 && <li className="dispute-queue__empty">Nothing here.</li>}
        {visible.map((ticket) => {
          const needsReply = awaitingReply(ticket);
          return <li key={ticket.id}>
            <button
              type="button"
              className={`dispute-queue__row${selected?.id === ticket.id ? " is-selected" : ""}`}
              onClick={() => setSelectedId(ticket.id)}
              aria-current={selected?.id === ticket.id ? "true" : undefined}
            >
              <span className={`dispute-queue__dot status-${ticket.status.toLowerCase()}`} aria-hidden="true" />
              <span className="dispute-queue__body">
                <span className="dispute-queue__title">{ticket.title}</span>
                <span className="dispute-queue__meta">
                  {ticket.order ? `#${ticket.order.orderNo} · ${ticket.order.gameName}` : "No order"} · {speaker(ticket.openedByRole)}
                </span>
              </span>
              <span className="dispute-queue__right">
                <time dateTime={ticket.updatedAt}>{timeFormat.format(new Date(ticket.updatedAt))}</time>
                {needsReply && <span className="dispute-queue__flag" title="Waiting on your reply"><i className="fa-solid fa-reply" aria-hidden="true" /></span>}
              </span>
            </button>
          </li>;
        })}
      </ol>

      {selected ? <DisputeDetail key={selected.id} ticket={selected} admins={admins} /> : <div className="dispute-detail dispute-detail--empty">
        <i className="fa-regular fa-comments" aria-hidden="true" />
        <strong>No ticket selected</strong>
        <p>Pick one from the queue, or widen the filter.</p>
      </div>}
    </div>
  </div>;
}

function DisputeDetail({ ticket, admins }: { ticket: DisputeRow; admins: AdminOption[] }) {
  const thread = ticket.messages.filter((message) => !message.internal);
  const internal = ticket.messages.filter((message) => message.internal);

  return <div className="dispute-detail">
    <header className="dispute-detail__head">
      <div>
        <span className={`status-badge status-${ticket.status.toLowerCase()}`}>{STATUS_LABEL[ticket.status] ?? ticket.status}</span>
        {ticket.closedByReporter && <span className="admin-ticket__flag admin-ticket__flag--muted"><i className="fa-solid fa-user-check" aria-hidden="true" /> Closed by reporter</span>}
        <h3>{ticket.title}</h3>
      </div>
      <time dateTime={ticket.createdAt}>{dateFormat.format(new Date(ticket.createdAt))}</time>
    </header>

    {ticket.order && <div className="admin-ticket__context">
      Order #{ticket.order.orderNo} · {ticket.order.gameName} · {ticket.order.status} · {ticket.order.candidates} candidates · {ticket.order.reports} game reports
      <span className="admin-ticket__links">
        <Link href={`/dashboard/admin/orders/${ticket.order.id}`}>Order &amp; reports</Link>
        <Link href={`/dashboard/admin/chat?q=${ticket.order.orderNo}`}>Linked chat</Link>
      </span>
    </div>}

    <ol className="ticket-thread ticket-thread--admin">
      <li className="ticket-message ticket-message--reporter">
        <div className="ticket-message__meta"><strong>{speaker(ticket.openedByRole)}</strong><time>{dateFormat.format(new Date(ticket.createdAt))}</time></div>
        <p>{ticket.description}</p>
      </li>
      {thread.map((message) => <li key={message.id} className={`ticket-message ticket-message--${message.authorRole === "ADMIN" ? "support" : "reporter"}`}>
        <div className="ticket-message__meta">
          <strong>{message.authorRole === "ADMIN" ? <><i className="fa-solid fa-headset" aria-hidden="true" /> Support</> : speaker(message.authorRole)}</strong>
          <time>{dateFormat.format(new Date(message.createdAt))}</time>
        </div>
        <p>{message.body}</p>
      </li>)}
    </ol>

    {/* The reply is the primary action and the only one that is always
        visible. Everything below it is either bookkeeping or irreversible,
        and both belong behind a deliberate click. */}
    <form action={replyAsAdmin} className="dispute-detail__reply">
      <input type="hidden" name="id" value={ticket.id} />
      <textarea name="body" required maxLength={3000} rows={3} placeholder="Write back to the reporter…" />
      <div className="dispute-detail__reply-foot">
        <small>The reporter is notified, and a pending ticket moves to in progress.</small>
        <button className="btn btn--vivid btn--sm"><i className="fa-solid fa-paper-plane" aria-hidden="true" /> Send reply</button>
      </div>
    </form>

    <details className="dispute-tool">
      <summary><i className="fa-solid fa-arrows-turn-to-dots" aria-hidden="true" /> Triage <span>status, owner, internal note</span></summary>
      <form action={updateDispute} className="admin-ticket__form">
        <input type="hidden" name="id" value={ticket.id} />
        <DashboardSelect name="status" value={ticket.status} label="Status" options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
        <DashboardSelect name="assigneeId" value={ticket.assigneeId ?? ""} label="Assigned admin" options={[{ value: "", label: "Unassigned" }, ...admins.map((admin) => ({ value: admin.id, label: admin.label }))]} />
        <input name="note" placeholder="Internal note — never shown to the reporter…" />
        <button className="btn btn--ghost btn--sm">Update</button>
      </form>
      {!!internal.length && <div className="dispute-tool__notes">
        {internal.map((note) => <p key={note.id}><small>{dateFormat.format(new Date(note.createdAt))}</small> {note.body}</p>)}
      </div>}
    </details>

    <details className="dispute-tool dispute-tool--danger">
      <summary><i className="fa-solid fa-gavel" aria-hidden="true" /> Resolve <span>moves money and closes the ticket</span></summary>
      {ticket.resolution && <p className="dispute-tool__warn">Already resolved as <strong>{ticket.resolution.replaceAll("_", " ").toLowerCase()}</strong>{ticket.amountEUR ? ` · €${ticket.amountEUR.toFixed(2)}` : ""}. Resolving again pays out again.</p>}
      <form action={resolveDispute} className="admin-ticket__form">
        <input type="hidden" name="id" value={ticket.id} />
        <DashboardSelect name="resolution" value="REJECTED" label="Resolution" options={RESOLUTIONS.map((value) => ({ value, label: value.replaceAll("_", " ").toLowerCase() }))} />
        <input name="amountEUR" type="number" min="0" step="0.01" placeholder="€ amount" />
        <input name="note" required placeholder="Resolution and reason — the reporter reads this…" />
        <button className="btn btn--vivid btn--sm">Resolve</button>
      </form>
    </details>
  </div>;
}
