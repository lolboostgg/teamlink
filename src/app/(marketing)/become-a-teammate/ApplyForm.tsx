"use client";

import { useState, useTransition } from "react";
import { submitTeammateApplication } from "@/app/actions/applications";
import { GAMES } from "@/lib/games";

const HOURS = ["Under 5 hours", "5–10 hours", "10–20 hours", "20+ hours"];

export function ApplyForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    discord: "",
    country: "",
    games: "",
    ranks: "",
    hours: HOURS[1],
    experience: "",
    website: "",
  });
  const [picked, setPicked] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Chips rather than a free-text field for the games: it is the one answer
  // we filter applications on, and typed-in game names arrive spelled six
  // different ways.
  function toggleGame(name: string) {
    setPicked((prev) => (prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (picked.length === 0) {
      setError("Pick at least one game you can take orders in.");
      return;
    }
    startTransition(async () => {
      const result = await submitTeammateApplication({ ...form, games: picked.join(", ") });
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
          <i className="fa-solid fa-check" aria-hidden="true" />
        </span>
        <h3>Application in</h3>
        <p>
          We read every one, usually within two or three days. If it is a fit you get an invite link by email — that
          link is what creates your teammate account, so keep an eye out for it.
        </p>
      </div>
    );
  }

  return (
    <form className="panel-form" onSubmit={submit}>
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
          <label htmlFor="apply-name">Your name</label>
          <input id="apply-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="form-row">
          <label htmlFor="apply-email">Email</label>
          <input
            id="apply-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="apply-discord">Discord username</label>
          <input
            id="apply-discord"
            value={form.discord}
            onChange={(e) => set("discord", e.target.value)}
            placeholder="yourname"
            required
          />
        </div>
        <div className="form-row">
          <label htmlFor="apply-country">Country</label>
          <input id="apply-country" value={form.country} onChange={(e) => set("country", e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <label>Games you can take orders in</label>
        <div className="chip-picker">
          {GAMES.map((game) => (
            <button
              type="button"
              key={game.slug}
              className={`chip${picked.includes(game.name) ? " is-on" : ""}`}
              onClick={() => toggleGame(game.name)}
              aria-pressed={picked.includes(game.name)}
            >
              {game.name}
            </button>
          ))}
        </div>
      </div>

      <div className="form-grid">
        <div className="form-row">
          <label htmlFor="apply-ranks">Your ranks</label>
          <input
            id="apply-ranks"
            value={form.ranks}
            onChange={(e) => set("ranks", e.target.value)}
            placeholder="e.g. Master 250 LP EUW, Immortal 2"
          />
        </div>
        <div className="form-row">
          <label htmlFor="apply-hours">Hours a week you could be online</label>
          <select id="apply-hours" value={form.hours} onChange={(e) => set("hours", e.target.value)}>
            {HOURS.map((h) => (
              <option key={h}>{h}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <label htmlFor="apply-experience">Anything else worth knowing</label>
        <textarea
          id="apply-experience"
          rows={5}
          value={form.experience}
          onChange={(e) => set("experience", e.target.value)}
          placeholder="Coaching or teammate experience, op.gg or tracker links, languages you speak, the hours you usually play."
        />
      </div>

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="btn btn--vivid" disabled={pending}>
        {pending ? "Sending…" : "Send application"}
      </button>
      <p className="form-note">
        You must be 18 or older, and you will verify your identity before your first payout.
      </p>
    </form>
  );
}
