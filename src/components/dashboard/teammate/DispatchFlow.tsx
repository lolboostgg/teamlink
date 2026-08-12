"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useDispatchState } from "@/lib/dispatch/useDispatchState";
import { withdrawDispatchAction } from "@/app/dashboard/teammate/dispatchActions";
import { useToast } from "@/components/ui/ToastProvider";

const NOT_SELECTED_ACK_KEY = "qup:acknowledged-not-selected";
// Orders we've already sent the teammate into the session room for. Without
// this the redirect below re-fires on every navigation, which locks them
// inside the session room for as long as the order sits in ASSIGNED.
const SESSION_ROUTED_KEY = "qup:routed-to-session";

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

/**
 * The dispatch flow, now driven entirely by the server's phase (see
 * lib/dispatch/service.ts). Accepting is a server action — the UI never
 * decides who gets an order, it only reflects what the DB committed.
 */
export function DispatchFlow({ hasTeammateProfile = false }: { hasTeammateProfile?: boolean }) {
  const { data: session } = useSession();
  // Admin accounts can explicitly open the teammate dashboard when they own
  // a linked teammate profile. Their persisted account role remains ADMIN,
  // so role alone is not the active-dashboard capability.
  const isTeammate = session?.user?.role === "TEAMMATE" || hasTeammateProfile;
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const state = useDispatchState(isTeammate);
  const [pending, startTransition] = useTransition();
  const [dismissed, setDismissed] = useState<string | null>(null);
  const stateOrderId = state.order?.id;
  // The URL carries the order number; the id stays the key the "already
  // routed once" marker is stored under, so an order that changes neither
  // still counts as the same one.
  const stateOrderNo = state.order?.orderNo;

  // The incoming-request modal is gone. Requests are answered in one place —
  // /dashboard/teammate/requests — and nothing else announces them: a dialog
  // that could appear over any page in the dashboard was interrupting work it
  // had no business interrupting, and it was a second, competing source of
  // the alert sound. Announcing is the requests panel's job now, and only
  // its job.

  // Being picked takes the teammate to the session room — but only once. The
  // phase stays SELECTED for the whole time the order is ASSIGNED (it only
  // becomes ACTIVE_SESSION once they mark themselves in-game, see phase.ts),
  // so redirecting on every pathname change meant they could not open
  // Reviews, their profile, or anything else until the session started.
  useEffect(() => {
    if (!isTeammate || !stateOrderId || !stateOrderNo) return;
    if (state.phase !== "SELECTED" && state.phase !== "ACTIVE_SESSION") return;
    const href = `/dashboard/teammate/session/${stateOrderNo}`;

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
  }, [isTeammate, state.phase, stateOrderId, stateOrderNo, pathname, router]);

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
    const href = `/dashboard/teammate/session/${state.order.orderNo}`;
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
