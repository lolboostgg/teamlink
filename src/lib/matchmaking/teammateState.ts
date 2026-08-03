import { firstAcceptedCandidate } from "@/lib/matchmaking/store";
import type { DispatchOrder } from "@/lib/matchmaking/types";

/**
 * The teammate side of a dispatch, as one explicit state instead of a pile
 * of booleans. Accepting a dispatch does NOT hand over the order — it makes
 * the teammate one of at most five candidates, and the customer (or the
 * auto-select timer) decides from there. That distinction is the whole
 * reason this machine exists.
 */
export type TeammatePhase =
  | "OFFLINE"
  | "ONLINE_IDLE"
  | "DISPATCH_INCOMING"
  | "WAITING_FOR_CUSTOMER_SELECTION"
  | "SELECTED"
  | "ACTIVE_SESSION"
  | "NOT_SELECTED";

export interface TeammateDispatchState {
  phase: TeammatePhase;
  /** The order this phase is about — null in OFFLINE / ONLINE_IDLE. */
  order: DispatchOrder | null;
  /** Milliseconds left on whichever countdown the phase is showing. */
  msLeft: number;
  /** 1-based slot among the candidates who accepted, null before accepting. */
  candidatePosition: number | null;
  /** First to accept — gets picked if the customer doesn't choose anyone. */
  isAutoSelect: boolean;
  acceptedCount: number;
  candidateSlots: number;
}

export const MAX_CANDIDATE_SLOTS = 5;

const IDLE: TeammateDispatchState = {
  phase: "ONLINE_IDLE",
  order: null,
  msLeft: 0,
  candidatePosition: null,
  isAutoSelect: false,
  acceptedCount: 0,
  candidateSlots: MAX_CANDIDATE_SLOTS,
};

function acceptedInOrder(order: DispatchOrder) {
  return order.candidates
    .filter((c) => c.status === "accepted")
    .sort((a, b) => (a.respondedAt ?? 0) - (b.respondedAt ?? 0));
}

/**
 * Picks the one order that owns the teammate's attention right now. An
 * active session outranks a pending selection, which outranks a fresh
 * invite — a teammate mid-session must never be shown a new dispatch.
 */
export function deriveTeammateState(
  orders: DispatchOrder[],
  teammateId: string | null,
  online: boolean,
  now = Date.now(),
): TeammateDispatchState {
  if (!teammateId) return { ...IDLE, phase: online ? "ONLINE_IDLE" : "OFFLINE" };

  const mine = orders.filter((o) => o.candidates.some((c) => c.teammateId === teammateId));

  const active = mine.find(
    (o) => o.selectedTeammateIds.includes(teammateId) && (o.status === "assigned" || o.status === "in_progress"),
  );
  if (active) {
    return {
      ...IDLE,
      phase: active.status === "in_progress" ? "ACTIVE_SESSION" : "SELECTED",
      order: active,
      msLeft: Math.max(0, (active.sessionStartAt ?? now) - now),
      acceptedCount: acceptedInOrder(active).length,
    };
  }

  const waiting = mine.find((o) => {
    const mineCandidate = o.candidates.find((c) => c.teammateId === teammateId);
    return (
      mineCandidate?.status === "accepted" &&
      (o.status === "searching" || o.status === "candidates_ready" || o.status === "selecting")
    );
  });
  if (waiting) {
    const accepted = acceptedInOrder(waiting);
    const position = accepted.findIndex((c) => c.teammateId === teammateId);
    return {
      phase: "WAITING_FOR_CUSTOMER_SELECTION",
      order: waiting,
      msLeft: Math.max(0, (waiting.selectionDeadline ?? waiting.dispatchDeadline) - now),
      candidatePosition: position >= 0 ? position + 1 : null,
      isAutoSelect: firstAcceptedCandidate(waiting.candidates)?.teammateId === teammateId,
      acceptedCount: accepted.length,
      candidateSlots: MAX_CANDIDATE_SLOTS,
    };
  }

  // Someone else got it — a passing notice, never an error state.
  const passedOver = mine.find(
    (o) =>
      o.candidates.find((c) => c.teammateId === teammateId)?.status === "accepted" &&
      o.selectedTeammateIds.length > 0 &&
      !o.selectedTeammateIds.includes(teammateId),
  );
  if (passedOver) {
    return { ...IDLE, phase: "NOT_SELECTED", order: passedOver };
  }

  if (!online) return { ...IDLE, phase: "OFFLINE" };

  const incoming = mine.find(
    (o) =>
      o.candidates.find((c) => c.teammateId === teammateId)?.status === "pending" &&
      (o.status === "searching" || o.status === "candidates_ready") &&
      now < o.dispatchDeadline,
  );
  if (incoming) {
    return {
      ...IDLE,
      phase: "DISPATCH_INCOMING",
      order: incoming,
      msLeft: Math.max(0, incoming.dispatchDeadline - now),
      acceptedCount: acceptedInOrder(incoming).length,
    };
  }

  return IDLE;
}

/**
 * Guard for every transition the UI can trigger. Keeps invalid moves out of
 * the store rather than trusting the component tree to hide the button.
 */
export function canRespondToDispatch(state: TeammateDispatchState): boolean {
  return state.phase === "DISPATCH_INCOMING";
}

export function canEnterOrderRoom(state: TeammateDispatchState): boolean {
  return state.phase === "SELECTED" || state.phase === "ACTIVE_SESSION";
}

/** A teammate is only reachable for new dispatches in these phases. */
export function isDispatchable(state: TeammateDispatchState): boolean {
  return state.phase === "ONLINE_IDLE";
}
