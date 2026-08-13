"use client";

import { useActionState, useState } from "react";
import { DashboardSelect } from "@/components/dashboard/DashboardSelect";
import { openDispute, type TicketFormState } from "@/app/dashboard/disputes/actions";

const MIN_DESCRIPTION = 10;
const MAX_DESCRIPTION = 3000;
const MAX_TITLE = 120;

export interface TicketOrderOption {
  id: string;
  orderNo: number;
  gameName: string;
  option: string;
}

/**
 * The "open a ticket" form, shared by the customer and teammate dashboards.
 *
 * A client component rather than a bare `<form action={…}>` for two reasons
 * that were both visible on the old page: a native `<select>` renders its
 * option list with the operating system's colours, which is a sheet of white
 * in the middle of a near-black dashboard, and a server action that throws
 * reaches the customer as the framework's error screen with everything they
 * typed gone. Here the picker is the dashboard's own, and a rejected
 * submission comes back as a sentence above the button with the draft intact.
 */
export function SupportTicketForm({ orders, hint }: { orders: TicketOrderOption[]; hint: string }) {
  const [orderId, setOrderId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [state, submit, pending] = useActionState(async (previous: TicketFormState, formData: FormData) => {
    const result = await openDispute(previous, formData);
    // Clearing here rather than in an effect: the fields are controlled, and
    // a form that keeps the old text after a successful send is the thing
    // that makes people submit the same ticket twice.
    if (result.ok) { setOrderId(""); setTitle(""); setDescription(""); }
    return result;
  }, {});

  const options = [
    { value: "", label: "Choose an order", icon: "fa-regular fa-circle" },
    ...orders.map((order) => ({
      value: order.id,
      label: `#${order.orderNo} · ${order.gameName} · ${order.option}`,
      icon: "fa-solid fa-receipt",
    })),
  ];
  const tooShort = description.trim().length > 0 && description.trim().length < MIN_DESCRIPTION;

  if (orders.length === 0) {
    return <div className="support-ticket-form support-ticket-form--empty">
      <i className="fa-regular fa-folder-open" aria-hidden="true" />
      <p>You need a finished order before you can open a ticket. {hint}</p>
    </div>;
  }

  return <form action={submit} className="support-ticket-form">
    <div className="support-ticket-form__head">
      <i className="fa-solid fa-life-ring" aria-hidden="true" />
      <div>
        <strong>Open a ticket</strong>
        <span>{hint}</span>
      </div>
    </div>

    {/* A div, not a label: DashboardSelect's trigger is a <button>, which is
        labelable, so wrapping it would make a click on the word "order" open
        the dropdown. The button carries its own aria-label. */}
    <div className="support-field">
      <span className="support-field__label">Which order?</span>
      <DashboardSelect name="orderId" value={orderId} onChange={setOrderId} options={options} label="Order this ticket is about" placeholder="Choose an order" />
    </div>

    <label className="support-field">
      <span className="support-field__label">Summary</span>
      <input
        name="title"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        maxLength={MAX_TITLE}
        placeholder="e.g. Teammate never joined the lobby"
        className="support-field__input"
      />
    </label>

    <label className="support-field">
      <span className="support-field__label">
        What happened?
        <small className={tooShort ? "is-short" : undefined}>
          {tooShort ? `${MIN_DESCRIPTION - description.trim().length} more characters` : `${description.length}/${MAX_DESCRIPTION}`}
        </small>
      </span>
      <textarea
        name="description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        maxLength={MAX_DESCRIPTION}
        rows={5}
        placeholder="Tell us what went wrong, and what you'd like us to do about it. Match times, names and anything you saw in chat all help."
        className="support-field__input support-field__input--area"
      />
    </label>

    {state.error && <p className="support-ticket-form__error" role="alert"><i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {state.error}</p>}
    {/* The confirmation stands down as soon as a second ticket is started —
        the submit cleared all three fields, so anything in them is new. */}
    {state.ok && !orderId && !title && !description && <p className="support-ticket-form__ok" role="status"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Ticket opened — our support team has been notified.</p>}

    <div className="support-ticket-form__foot">
      <button className="btn btn--vivid" disabled={pending}>
        {pending ? <><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> Sending…</> : <><i className="fa-solid fa-paper-plane" aria-hidden="true" /> Open ticket</>}
      </button>
      <small>Most tickets get a first reply within a few hours.</small>
    </div>
  </form>;
}
