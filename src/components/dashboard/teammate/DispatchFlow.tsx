"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PriceTag } from "@/components/currency/PriceTag";
import { gameIcon } from "@/lib/gameArt";
import { playNotificationSound } from "@/lib/notificationSound";
import { useDispatchState } from "@/lib/dispatch/useDispatchState";
import { respondToDispatchAction } from "@/app/dashboard/teammate/dispatchActions";
import { withdrawDispatchAction } from "@/app/dashboard/teammate/dispatchActions";
import { useToast } from "@/components/ui/ToastProvider";
import type { DispatchOrderView } from "@/lib/dispatch/phase";

const SELECTION_ACK_KEY = "teamlink:acknowledged-selections";
const NOT_SELECTED_ACK_KEY = "teamlink:acknowledged-not-selected";

function acknowledgedItems(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "[]");
  } catch {
    return [];
  }
}

function acknowledgeItem(key: string, orderId: string) {
  if (typeof window === "undefined") return;
  const ids = new Set(acknowledgedItems(key));
  ids.add(orderId);
  window.localStorage.setItem(key, JSON.stringify([...ids].slice(-30)));
}

function seconds(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

function CountdownRing({ msLeft, totalMs }: { msLeft: number; totalMs: number }) {
  const pct = Math.max(0, Math.min(1, msLeft / totalMs));
  const urgent = msLeft < 6000;

  return (
    <div
      className={`dispatch-ring${urgent ? " is-urgent" : ""}`}
      style={{ ["--ring-pct" as string]: `${pct * 360}deg` }}
      role="timer"
    >
      <span>{seconds(msLeft)}</span>
    </div>
  );
}

function OrderFacts({ order }: { order: DispatchOrderView }) {
  const facts: [string, string][] = [
    ["Service", order.option],
    ["Customer", order.customerLabel],
    ["Team size", `${order.teammatesRequested} teammate${order.teammatesRequested === 1 ? "" : "s"}`],
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
 * The dispatch flow, now driven entirely by the server's phase (see
 * lib/dispatch/service.ts). Accepting is a server action — the UI never
 * decides who gets an order, it only reflects what the DB committed.
 */
export function DispatchFlow() {
  const { data: session } = useSession();
  const isTeammate = session?.user?.role === "TEAMMATE";
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const state = useDispatchState();
  const [pending, startTransition] = useTransition();
  const announced = useRef<string | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [dismissedSelection, setDismissedSelection] = useState<string | null>(null);
  const stateOrderId = state.order?.id;
  const stateOrderGameName = state.order?.gameName;
  const stateOrderOption = state.order?.option;

  useEffect(() => {
    if (state.phase !== "DISPATCH_INCOMING" || !stateOrderId) return;
    if (announced.current === stateOrderId) return;
    announced.current = stateOrderId;
    playNotificationSound();
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("New order request", { body: `${stateOrderGameName} · ${stateOrderOption}` });
    }
  }, [state.phase, stateOrderId, stateOrderGameName, stateOrderOption]);

  useEffect(() => {
    if (state.phase !== "NOT_SELECTED" || !stateOrderId) return;
    const dismiss = () => {
      acknowledgeItem(NOT_SELECTED_ACK_KEY, stateOrderId);
      setDismissed(stateOrderId);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    const timer = window.setTimeout(dismiss, 5000);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [state.phase, stateOrderId]);

  if (!isTeammate) return null;

  function respond(accept: boolean) {
    const orderId = state.order?.id;
    if (!orderId) return;
    startTransition(async () => {
      const result = await respondToDispatchAction(orderId, accept);
      if (!result.ok) showToast(result.error, "error");
      state.refresh();
    });
  }

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
              <PriceTag amountEUR={order.payoutEUR} />
            </div>
          </div>

          <OrderFacts order={order} />

          <p className="dispatch-modal__note">
            Accepting puts you in the candidate pool — the customer still picks from up to {state.maxCandidates}{" "}
            teammates. Only accept if you can start right away.
          </p>

          <div className="dispatch-modal__actions">
            <button type="button" className="btn btn--ghost" disabled={pending} onClick={() => respond(false)}>
              Decline
            </button>
            <button
              type="button"
              className="btn btn--vivid dispatch-modal__accept"
              disabled={pending}
              onClick={() => respond(true)}
            >
              {pending ? "Sending..." : "Accept order"}
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

          <div className="dispatch-slot-row">
            {Array.from({ length: state.maxCandidates }, (_, i) => (
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
                Candidate {state.candidatePosition ?? "—"} of {state.maxCandidates}
              </strong>
              <span>The customer can still pick you until the timer runs out.</span>
            </div>
          )}

          <p className="dispatch-modal__note">You won&rsquo;t receive other requests while this is open.</p>
          <div className="dispatch-modal__actions">
            <button
              type="button"
              className="btn btn--ghost"
              disabled={pending}
              onClick={() => startTransition(async () => {
                const result = await withdrawDispatchAction(state.order!.id);
                if (!result.ok) showToast(result.error, "error");
                state.refresh();
              })}
            >
              Withdraw acceptance
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "SELECTED" && state.order) {
    const order = state.order;

    // DispatchFlow lives in the shared dashboard layout, so it remains
    // mounted after navigating to the order room. Do not cover the room
    // with the same selection modal once the teammate has opened it.
    if (
      pathname === `/dashboard/teammate/session/${order.id}` ||
      dismissedSelection === order.id ||
      acknowledgedItems(SELECTION_ACK_KEY).includes(order.id)
    ) return null;

    function dismissSelection() {
      acknowledgeItem(SELECTION_ACK_KEY, order.id);
      setDismissedSelection(order.id);
    }

    return (
      <div className="dispatch-modal__backdrop" role="status">
        <div className="dispatch-modal dispatch-modal--selected">
          <button type="button" className="dispatch-modal__close" aria-label="Close" onClick={dismissSelection}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
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
              onClick={() => {
                dismissSelection();
                router.push(`/dashboard/teammate/session/${order.id}`);
              }}
            >
              Open the order room
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (
    state.phase === "NOT_SELECTED" &&
    state.order &&
    dismissed !== state.order.id &&
    !acknowledgedItems(NOT_SELECTED_ACK_KEY).includes(state.order.id)
  ) {
    const orderId = state.order.id;
    function dismissNotSelected() {
      acknowledgeItem(NOT_SELECTED_ACK_KEY, orderId);
      setDismissed(orderId);
    }

    return (
      <div
        className="dispatch-modal__backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="not-selected-title"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) dismissNotSelected();
        }}
      >
        <div className="dispatch-modal dispatch-modal--neutral">
          <button type="button" className="dispatch-modal__close" aria-label="Close" onClick={dismissNotSelected}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
          <h2 className="dispatch-modal__title" id="not-selected-title">Not this time</h2>
          <p className="dispatch-modal__lead">The customer picked another teammate.</p>
          <p className="dispatch-modal__note">You&rsquo;re still online and can take new orders right away.</p>
        </div>
      </div>
    );
  }

  return null;
}
