"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { PriceTag } from "@/components/currency/PriceTag";
import { gameIcon } from "@/lib/gameArt";
import { playNotificationSound } from "@/lib/notificationSound";
import { ackDispatchAlert } from "@/lib/dispatch/ack";
import { useDispatchState } from "@/lib/dispatch/useDispatchState";
import { respondToDispatchAction } from "@/app/dashboard/teammate/dispatchActions";
import { withdrawDispatchAction } from "@/app/dashboard/teammate/dispatchActions";
import { useToast } from "@/components/ui/ToastProvider";
import type { DispatchOrderView } from "@/lib/dispatch/phase";

const NOT_SELECTED_ACK_KEY = "teamlink:acknowledged-not-selected";
// Orders we've already sent the teammate into the session room for. Without
// this the redirect below re-fires on every navigation, which locks them
// inside the session room for as long as the order sits in ASSIGNED.
const SESSION_ROUTED_KEY = "teamlink:routed-to-session";

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
  // "Service" lived here too, repeating the game row directly above it.
  const facts: [string, string][] = [
    ["Customer", order.customerLabel],
    ["Team size", `${order.teammatesRequested} teammate${order.teammatesRequested === 1 ? "" : "s"}`],
  ];

  // Only what the customer actually stated — three rows of "No preference"
  // filled the card without telling the teammate anything.
  const prefs = ([
    ["Conversation", order.conversationPref],
    ["Play style", order.playStylePref],
    ["Vibe", order.vibe],
  ] as [string, string | null][]).filter(([, value]) => value);

  return (
    <>
      <dl className="dispatch-facts">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      {prefs.length > 0 && (
        <div className="dispatch-prefs">
          <span className="dispatch-prefs__label">What they asked for</span>
          <div className="dispatch-prefs__pills">
            {prefs.map(([label, value]) => (
              <span key={label} className="dispatch-prefs__pill">
                <small>{label}</small>
                {value}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
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
  const stateOrderId = state.order?.id;
  const stateOrderGameName = state.order?.gameName;
  const stateOrderOption = state.order?.option;

  // The open-requests page is this modal, spread out and with every other
  // invitation next to it. Laying a one-order dialog over the top hides the
  // list the teammate went there to read, and both would announce the same
  // request twice over.
  const onRequestsPage = pathname === "/dashboard/teammate/requests";

  // Inside an order, an alert is noise at best. A teammate in a session is
  // reading a chat, watching a timer or writing up a game, and the one sound
  // that is designed to cut through a voice call is the last thing that
  // belongs there — least of all when it is announcing something they are
  // not free to take.
  const inOrder = pathname.startsWith("/dashboard/teammate/session/");

  // The alert only ever means "there is something here you can accept". Not
  // the phase alone: the phase is derived from the newest candidate row and
  // can name an order that is no longer on offer, which is where the sound
  // that seemed to arrive out of nowhere came from. An actionable invitation
  // is one that is in the open-requests list.
  const openRequestCount = state.requests.length;

  useEffect(() => {
    if (onRequestsPage || inOrder) return;
    if (state.phase !== "DISPATCH_INCOMING" || !stateOrderId) return;
    if (openRequestCount === 0) return;
    if (announced.current === stateOrderId) return;
    announced.current = stateOrderId;
    ackDispatchAlert(stateOrderId);
    playNotificationSound();
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("New order request", { body: `${stateOrderGameName} · ${stateOrderOption}` });
    }
  }, [
    onRequestsPage,
    inOrder,
    openRequestCount,
    state.phase,
    stateOrderId,
    stateOrderGameName,
    stateOrderOption,
  ]);

  // Being picked takes the teammate to the session room — but only once. The
  // phase stays SELECTED for the whole time the order is ASSIGNED (it only
  // becomes ACTIVE_SESSION once they mark themselves in-game, see phase.ts),
  // so redirecting on every pathname change meant they could not open
  // Reviews, their profile, or anything else until the session started.
  useEffect(() => {
    if (!isTeammate || !stateOrderId) return;
    if (state.phase !== "SELECTED" && state.phase !== "ACTIVE_SESSION") return;
    const href = `/dashboard/teammate/session/${stateOrderId}`;

    // Marked as done only once we can see we actually got there. It used to
    // be marked first and navigated second, which meant a single navigation
    // that didn't take — a re-render landing on top of it, a route still
    // loading — burned the one chance forever and left the teammate sitting
    // on whatever page they were on, with an order waiting for them.
    if (pathname === href) {
      acknowledgeItem(SESSION_ROUTED_KEY, stateOrderId);
      return;
    }
    // Only the first arrival is forced. After that they are free to open
    // Reviews or their profile without being yanked back.
    if (acknowledgedItems(SESSION_ROUTED_KEY).includes(stateOrderId)) return;
    router.replace(href);
  }, [isTeammate, state.phase, stateOrderId, pathname, router]);

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

  if (state.phase === "DISPATCH_INCOMING" && state.order && !onRequestsPage) {
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

  // Now that being picked no longer pins the teammate to the session room,
  // there has to be a way back — otherwise a running order is only reachable
  // via the Orders list, which reads like it isn't running at all.
  if ((state.phase === "SELECTED" || state.phase === "ACTIVE_SESSION") && state.order) {
    const href = `/dashboard/teammate/session/${state.order.id}`;
    if (pathname === href) return null;

    return (
      <div className="running-order-bar" role="status">
        <span className="running-order-bar__pulse" aria-hidden="true" />
        <div className="running-order-bar__copy">
          <strong>Order in progress</strong>
          <span>
            {state.order.gameName} &middot; {state.order.option}
          </span>
        </div>
        <Link href={href} className="btn btn--vivid btn--sm">
          Back to order
        </Link>
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
