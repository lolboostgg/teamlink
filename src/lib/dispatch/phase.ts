import type { TeammatePhase } from "@/lib/matchmaking/teammateState";

// Shapes crossing the API boundary. Deliberately narrow — the teammate view
// carries no other candidate's identity, only counts (see spec §7).
export interface DispatchOrderView {
  id: string;
  gameSlug: string;
  gameName: string;
  option: string;
  priceEUR: number;
  payoutEUR: number;
  customerLabel: string;
  teammatesRequested: number;
  vibe: string | null;
  conversationPref: string | null;
  playStylePref: string | null;
  status: string;
  sessionStatus: string | null;
  assignedAt: number | null;
  games: { gameNumber: number; result: string; note: string | null; proofPath: string | null }[];
}

export interface DispatchStateView {
  phase: TeammatePhase;
  order: DispatchOrderView | null;
  msLeft: number;
  candidatePosition: number | null;
  isAutoSelect: boolean;
  acceptedCount: number;
}

type CandidateRow = {
  status: string;
  selected: boolean;
  candidatePosition: number | null;
  isAutoSelect: boolean;
  expiresAt: Date | null;
  order: {
    id: string;
    gameSlug: string;
    gameName: string;
    option: string;
    priceEUR: unknown;
    teammatePayoutEUR: unknown;
    customerLabel: string;
    teammatesRequested: number;
    vibe: string | null;
    conversationPref: string | null;
    playStylePref: string | null;
    status: string;
    sessionStatus: string | null;
    assignedAt: Date | null;
    dispatchDeadline: Date;
    selectionDeadline: Date | null;
    candidates: { status: string }[];
    games: { gameNumber: number; result: string; note: string | null; proofPath: string | null }[];
  };
};

function toView(order: CandidateRow["order"]): DispatchOrderView {
  const price = Number(order.priceEUR);
  return {
    id: order.id,
    gameSlug: order.gameSlug,
    gameName: order.gameName,
    option: order.option,
    priceEUR: price,
    // No commission model yet — the teammate's cut mirrors the order price
    // until one exists, rather than inventing a split here.
    payoutEUR: order.teammatePayoutEUR !== null ? Number(order.teammatePayoutEUR) : price,
    customerLabel: order.customerLabel,
    teammatesRequested: order.teammatesRequested,
    vibe: order.vibe,
    conversationPref: order.conversationPref,
    playStylePref: order.playStylePref,
    status: order.status,
    sessionStatus: order.sessionStatus,
    assignedAt: order.assignedAt?.getTime() ?? null,
    games: order.games,
  };
}

/**
 * Same precedence as the client machine: an active session beats a pending
 * selection, which beats a fresh invite. Computed server-side so the phase
 * can't be talked into something the DB doesn't agree with.
 */
export function deriveServerPhase(rows: CandidateRow[], available: boolean, now = Date.now()): DispatchStateView {
  const empty: DispatchStateView = {
    phase: available ? "ONLINE_IDLE" : "OFFLINE",
    order: null,
    msLeft: 0,
    candidatePosition: null,
    isAutoSelect: false,
    acceptedCount: 0,
  };

  const acceptedIn = (row: CandidateRow) => row.order.candidates.filter((c) => c.status === "ACCEPTED").length;

  const active = rows.find((r) => r.selected && ["ASSIGNED", "IN_PROGRESS"].includes(r.order.status));
  if (active) {
    return {
      phase: active.order.status === "IN_PROGRESS" ? "ACTIVE_SESSION" : "SELECTED",
      order: toView(active.order),
      msLeft: 0,
      candidatePosition: active.candidatePosition,
      isAutoSelect: active.isAutoSelect,
      acceptedCount: acceptedIn(active),
    };
  }

  const waiting = rows.find(
    (r) => r.status === "ACCEPTED" && ["SEARCHING", "CANDIDATES_READY", "SELECTING"].includes(r.order.status),
  );
  if (waiting) {
    const deadline = waiting.order.selectionDeadline ?? waiting.order.dispatchDeadline;
    return {
      phase: "WAITING_FOR_CUSTOMER_SELECTION",
      order: toView(waiting.order),
      msLeft: Math.max(0, deadline.getTime() - now),
      candidatePosition: waiting.candidatePosition,
      isAutoSelect: waiting.isAutoSelect,
      acceptedCount: acceptedIn(waiting),
    };
  }

  const passedOver = rows.find(
    (r) => r.status === "ACCEPTED" && !r.selected && ["ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(r.order.status),
  );
  if (passedOver) {
    return { ...empty, phase: "NOT_SELECTED", order: toView(passedOver.order) };
  }

  if (!available) return { ...empty, phase: "OFFLINE" };

  const incoming = rows.find(
    (r) =>
      r.status === "PENDING" &&
      ["SEARCHING", "CANDIDATES_READY"].includes(r.order.status) &&
      (!r.expiresAt || r.expiresAt.getTime() > now),
  );
  if (incoming) {
    const deadline = incoming.expiresAt ?? incoming.order.dispatchDeadline;
    return {
      ...empty,
      phase: "DISPATCH_INCOMING",
      order: toView(incoming.order),
      msLeft: Math.max(0, deadline.getTime() - now),
      acceptedCount: acceptedIn(incoming),
    };
  }

  return empty;
}
