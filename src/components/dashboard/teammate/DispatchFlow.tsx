"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PriceTag } from "@/components/currency/PriceTag";
import { gameIcon } from "@/lib/gameArt";
import { playNotificationSound } from "@/lib/notificationSound";
import { useTeammateDispatchState } from "@/lib/matchmaking/useTeammateDispatchState";
import { MAX_CANDIDATE_SLOTS } from "@/lib/matchmaking/teammateState";
import type { DispatchOrder } from "@/lib/matchmaking/types";

function seconds(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

/** Ring that empties as the countdown runs out. */
function CountdownRing({ msLeft, totalMs }: { msLeft: number; totalMs: number }) {
  const pct = Math.max(0, Math.min(1, msLeft / totalMs));
  const urgent = msLeft < 6000;

  return (
    <div
      className={`dispatch-ring${urgent ? " is-urgent" : ""}`}
      style={{ ["--ring-pct" as string]: `${pct * 360}deg` }}
      role="timer"
      aria-live="off"
    >
      <span>{seconds(msLeft)}</span>
    </div>
  );
}

function OrderFacts({ order }: { order: DispatchOrder }) {
  const facts: [string, string][] = [
    ["Service", order.option],
    ["Customer", order.customerLabel],
    ["Team size", `${order.teammates} teammate${order.teammates === 1 ? "" : "s"}`],
    ["Conversation", order.conversationPref ?? "No preference"],
    ["Play style", order.playStylePref ?? "No preference"],
    ["Vibe", order.vibe ?? "No preference"],
  ];

  return (
    <dl className="dispatch-facts">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Everything between a dispatch arriving and the order room opening:
 * the incoming request, the candidate waiting state, and the two outcomes.
 * Mounted once in the dashboard shell so it follows the teammate across
 * pages instead of only existing on the overview.
 */
export function DispatchFlow() {
  const { data: session } = useSession();
  const isTeammate = session?.user?.role === "TEAMMATE";
  const router = useRouter();
  const state = useTeammateDispatchState();
  const announced = useRef<string | null>(null);
  const [dismissedNotice, setDismissedNotice] = useState<string | null>(null);

  // One alert per arriving dispatch, not per render.
  useEffect(() => {
    if (state.phase !== "DISPATCH_INCOMING" || !state.order) return;
    if (announced.current === state.order.id) return;
    announced.current = state.order.id;
    playNotificationSound();
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("New order request", { body: `${state.order.gameName} · ${state.order.option}` });
    }
  }, [state.phase, state.order]);

  // "Someone else got it" is a passing notice — it clears itself.
  useEffect(() => {
    if (state.phase !== "NOT_SELECTED" || !state.order) return;
    const id = state.order.id;
    const timer = setTimeout(() => setDismissedNotice(id), 5000);
    return () => clearTimeout(timer);
  }, [state.phase, state.order]);

  if (!isTeammate) return null;

  if (state.phase === "DISPATCH_INCOMING" && state.order) {
    const order = state.order;
    return (
      <div className="dispatch-modal__backdrop" role="dialog" aria-modal="true" aria-labelledby="dispatch-title">
        <div className="dispatch-modal">
          <div className="dispatch-modal__head">
            <div>
              <div className="dispatch-modal__eyebrow">Incoming request</div>
              <h2 className="dispatch-modal__title" id="dispatch-title">
                New order request
              </h2>
            </div>
            <CountdownRing msLeft={state.msLeft} totalMs={60_000} />
          </div>

          <div className="dispatch-modal__game">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gameIcon(order.gameSlug)} alt="" />
            <div>
              <strong>{order.gameName}</strong>
              <span>{order.option}</span>
            </div>
            <div className="dispatch-modal__payout">
              <span>Your payout</span>
              <PriceTag amountEUR={order.priceEUR} />
            </div>
          </div>

          <OrderFacts order={order} />

          <p className="dispatch-modal__note">
            Accepting puts you in the candidate pool — the customer still picks from up to {MAX_CANDIDATE_SLOTS}{" "}
            teammates. Only accept if you can start right away.
          </p>

          <div className="dispatch-modal__actions">
            <button type="button" className="btn btn--ghost" onClick={() => state.respond(false)}>
              Decline
            </button>
            <button type="button" className="btn btn--vivid dispatch-modal__accept" onClick={() => state.respond(true)}>
              Accept order
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "WAITING_FOR_CUSTOMER_SELECTION" && state.order) {
    return (
      <div className="dispatch-modal__backdrop" role="status">
        <div className="dispatch-modal dispatch-modal--waiting">
          <div className="dispatch-modal__head">
            <div>
              <div className="dispatch-modal__eyebrow">Order accepted</div>
              <h2 className="dispatch-modal__title">Waiting for the customer</h2>
            </div>
            <CountdownRing msLeft={state.msLeft} totalMs={60_000} />
          </div>

          <p className="dispatch-modal__lead">
            The customer can see your profile now. They pick from everyone who accepted.
          </p>

          <div className={`dispatch-slot-row${state.isAutoSelect ? " is-auto" : ""}`}>
            {Array.from({ length: MAX_CANDIDATE_SLOTS }, (_, i) => (
              <span
                key={i}
                className={`dispatch-slot${i < state.acceptedCount ? " is-filled" : ""}${
                  state.candidatePosition === i + 1 ? " is-me" : ""
                }`}
              />
            ))}
          </div>

          {state.isAutoSelect ? (
            <div className="dispatch-status dispatch-status--auto">
              <strong>You&rsquo;re the auto-select</strong>
              <span>You accepted first — if the customer doesn&rsquo;t pick anyone else, the order is yours.</span>
            </div>
          ) : (
            <div className="dispatch-status">
              <strong>
                Candidate {state.candidatePosition ?? "—"} of {MAX_CANDIDATE_SLOTS}
              </strong>
              <span>The customer can still pick you until the timer runs out.</span>
            </div>
          )}

          <p className="dispatch-modal__note">
            You won&rsquo;t receive other requests while this is open.
          </p>
        </div>
      </div>
    );
  }

  if (state.phase === "SELECTED" && state.order) {
    const order = state.order;
    return (
      <div className="dispatch-modal__backdrop" role="status">
        <div className="dispatch-modal dispatch-modal--selected">
          <span className="dispatch-modal__check">
            <i className="fa-solid fa-check" aria-hidden="true" />
          </span>
          <h2 className="dispatch-modal__title">You&rsquo;ve been selected</h2>
          <p className="dispatch-modal__lead">
            {order.customerLabel} wants to play {order.gameName} with you.
          </p>
          <div className="dispatch-modal__actions">
            <button
              type="button"
              className="btn btn--vivid"
              onClick={() => router.push(`/dashboard/teammate/session/${order.id}`)}
            >
              Open the order room
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "NOT_SELECTED" && state.order && dismissedNotice !== state.order.id) {
    return (
      <div className="dispatch-modal__backdrop" role="status">
        <div className="dispatch-modal dispatch-modal--neutral">
          <h2 className="dispatch-modal__title">Not this time</h2>
          <p className="dispatch-modal__lead">The customer picked another teammate.</p>
          <p className="dispatch-modal__note">You&rsquo;re still online and can take new orders right away.</p>
        </div>
      </div>
    );
  }

  return null;
}
