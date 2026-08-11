"use client";

import { useState, useTransition } from "react";
import { submitContactMessage } from "@/app/actions/applications";
import { useLanguage } from "@/components/language/LanguageProvider";

const TOPICS = ["An order or refund", "Payments", "Becoming a teammate", "Press or partnership", "Something else"];

export function ContactForm() {
  const { p } = useLanguage();
  const [form, setForm] = useState({ name: "", email: "", topic: TOPICS[0], orderNo: "", message: "", website: "" });
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitContactMessage(form);
      if (!result.ok) {
        setError(result.error ?? "That didn't send. Try again in a moment.");
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="form-done">
        <span className="form-done__icon">
          <i className="fa-solid fa-paper-plane" aria-hidden="true" />
        </span>
        <h3>{p("Message sent")}</h3>
        <p>
          It is in the support inbox now. We answer within a few hours during European evenings, and by the next
          morning otherwise — watch the address you gave us.
        </p>
      </div>
    );
  }

  return (
    <form className="panel-form" onSubmit={submit}>
      {/* Honeypot: off-screen and hidden from assistive tech, so only a script
          fills it. A filled one is dropped server-side (see actions). */}
      <input
        className="hp-field"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={form.website}
        onChange={(e) => set("website", e.target.value)}
      />

      <div className="form-grid">
        <div className="form-row">
          <label htmlFor="contact-name">{p("Your name")}</label>
          <input id="contact-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="form-row">
          <label htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="contact-topic">{p("What is it about?")}</label>
          <select id="contact-topic" value={form.topic} onChange={(e) => set("topic", e.target.value)}>
            {TOPICS.map((topic) => (
              <option key={topic} value={topic}>{p(topic)}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <label htmlFor="contact-order">{p("Order number (if you have one)")}</label>
          <input id="contact-order" value={form.orderNo} onChange={(e) => set("orderNo", e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="contact-message">{p("Message")}</label>
        <textarea
          id="contact-message"
          rows={6}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder={p("What happened, and what would fix it?")}
          required
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn btn--vivid" disabled={pending}>
        {pending ? "Sending…" : "Send message"}
      </button>
      <p className="form-note">
        We only use what you write here to answer you — see the Privacy Policy for how long we keep it.
      </p>
    </form>
  );
}
