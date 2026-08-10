"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";
import { reassignTeammate, manualRefund } from "@/app/dashboard/admin/orders/actions";

interface Match {
  id: string;
  name: string;
  rating: number;
  available: boolean;
  busy: boolean;
  games: string[];
}

/**
 * The two things an admin needed another browser tab for.
 *
 * **Reassign.** A teammate who stops answering mid-session used to leave one
 * lever — cancel — so a customer whose teammate vanished got a refund instead
 * of a session. This keeps the order and changes who is on it.
 *
 * **Refund by hand.** order.refund_due alerts when the automatic refund
 * fails, and it linked to a page that could only display the problem; the fix
 * was in Stripe, in another tab, against a payment intent somebody had to go
 * and find. It runs the same refund path the automatic one uses.
 *
 * Both are deliberately behind a disclosure rather than sitting open next to
 * cancel and complete. They are the rescue tools, reached for when something
 * has already gone wrong, and a live order should not offer four equally
 * weighted destructive buttons.
 */
export function AdminOrderRescue({
  orderId,
  gameSlug,
  priceEUR,
  settled,
}: {
  orderId: string;
  gameSlug: string;
  priceEUR: number;
  settled: boolean;
}) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState<"reassign" | "refund" | null>(null);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [picked, setPicked] = useState<Match | null>(null);
  const [amount, setAmount] = useState(priceEUR.toFixed(2));
  const [pending, startTransition] = useTransition();

  async function search(value: string) {
    setQuery(value);
    setPicked(null);
    if (value.trim().length < 2) {
      setMatches([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/teammates/search?q=${encodeURIComponent(value)}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { teammates: Match[] };
      setMatches(data.teammates);
    } catch {
      // A failed lookup leaves the last list up rather than clearing it under
      // somebody mid-decision.
    }
  }

  function run(fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    startTransition(async () => {
      try {
        const result = await fn();
        if (!result.ok) {
          showToast(result.error ?? "That didn't work.", "error");
          return;
        }
        showToast(result.message ?? "Done.", "success");
        setOpen(null);
        setPicked(null);
        setQuery("");
        setMatches([]);
        router.refresh();
      } catch (err) {
        showToast(err instanceof Error ? err.message : "Something went wrong.", "error");
      }
    });
  }

  return (
    <section className="rescue">
      <div className="rescue__head">
        <div>
          <b>Rescue</b>
          <small>For an order that has gone wrong in a way the normal flow does not cover.</small>
        </div>
        <div className="rescue__tabs">
          <button
            type="button"
            className={`btn btn--ghost btn--sm${open === "reassign" ? " is-active" : ""}`}
            disabled={settled}
            title={settled ? "This order has already finished." : undefined}
            onClick={() => setOpen(open === "reassign" ? null : "reassign")}
          >
            <i className="fa-solid fa-right-left" aria-hidden="true" /> Swap teammate
          </button>
          <button
            type="button"
            className={`btn btn--ghost btn--sm${open === "refund" ? " is-active" : ""}`}
            onClick={() => setOpen(open === "refund" ? null : "refund")}
          >
            <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Refund by hand
          </button>
        </div>
      </div>

      {open === "reassign" && (
        <div className="rescue__body">
          <label className="rescue__field">
            <span>Find a teammate</span>
            <input
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Type at least two letters…"
              autoFocus
            />
          </label>

          {matches.length > 0 && (
            <ul className="rescue__matches">
              {matches.map((match) => {
                const listed = match.games.includes(gameSlug);
                return (
                  <li key={match.id}>
                    <button
                      type="button"
                      className={`rescue__match${picked?.id === match.id ? " is-picked" : ""}`}
                      onClick={() => setPicked(match)}
                    >
                      <b>{match.name}</b>
                      <span className="rescue__match-meta">
                        <i className="fa-solid fa-star" aria-hidden="true" /> {match.rating.toFixed(1)}
                        {/* The three things that would have stopped the
                            dispatcher picking them, said out loud — this is an
                            override, and an override should show what it is
                            overriding. */}
                        {!listed && <em>not listed for this game</em>}
                        {!match.available && <em>offline</em>}
                        {match.busy && <em>on another order</em>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {picked && (
            <div className="rescue__confirm">
              <p>
                Move this order to <b>{picked.name}</b>? Whoever is on it now is taken off and {picked.name} is told
                immediately. Nothing is refunded and the price does not change.
              </p>
              <button
                type="button"
                className="btn btn--vivid btn--sm"
                disabled={pending}
                onClick={() => run(() => reassignTeammate(orderId, picked.id))}
              >
                {pending ? "Moving…" : `Move to ${picked.name}`}
              </button>
            </div>
          )}
        </div>
      )}

      {open === "refund" && (
        <div className="rescue__body">
          <label className="rescue__field rescue__field--amount">
            <span>Amount to return</span>
            <div>
              <em>&euro;</em>
              <input
                type="number"
                min="0.01"
                max={priceEUR}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </label>
          <p className="rescue__note">
            An account is credited, a guest is refunded to the card they paid with. Capped at what was actually taken,
            so a typo cannot hand back more than came in. The order paid <b>&euro;{priceEUR.toFixed(2)}</b>.
          </p>
          <button
            type="button"
            className="btn btn--danger btn--sm"
            disabled={pending || !(Number(amount) > 0)}
            onClick={() => run(() => manualRefund(orderId, Number(amount)))}
          >
            {pending ? "Refunding…" : `Refund €${Number(amount || 0).toFixed(2)}`}
          </button>
        </div>
      )}
    </section>
  );
}
