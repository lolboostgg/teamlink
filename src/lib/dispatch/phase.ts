import { payoutForOrder } from "@/lib/payoutSplit";
import type { AvatarFrame } from "@/lib/avatarFrame";
import { publicCustomerName } from "@/lib/customerName";

// The teammate's position in the dispatch flow. Accepting makes you a
// candidate, not the assignee — see lib/dispatch/service.ts.
export type TeammatePhase =
  | "OFFLINE"
  | "ONLINE_IDLE"
  | "DISPATCH_INCOMING"
  | "WAITING_FOR_CUSTOMER_SELECTION"
  | "SELECTED"
  | "ACTIVE_SESSION"
  | "NOT_SELECTED";

// Shapes crossing the API boundary. Deliberately narrow — the teammate view
// carries no other candidate's identity, only counts (see spec §7).
export interface DispatchOrderView {
  id: string;
  orderNo: number;
  /** The assigned teammate — what the chat thread is keyed on. */
  teammateId: string | null;
  gameSlug: string;
  gameName: string;
  option: string;
  priceEUR: number;
  payoutEUR: number;
  customerLabel: string;
  /** The assigned teammate's display name — what the customer sees them as. */
  teammateName?: string;
  teammatesRequested: number;
  gamesBooked: number;
  vibe: string | null;
  conversationPref: string | null;
  playStylePref: string | null;
  status: string;
  sessionStatus: string | null;
  assignedAt: number | null;
  teammateCompletedSessions?: number;
  teammateAvatarUrl?: string | null;
  customerAvatarUrl?: string | null;
  // How each side framed their picture — see lib/avatarFrame.ts.
  teammateAvatarFrame?: AvatarFrame | null;
  customerAvatarFrame?: AvatarFrame | null;
  games: { gameNumber: number; result: string; note: string | null; proofPath: string | null; proofName: string | null }[];
  // The in-game identity snapshotted at checkout (CheckoutIngameStep) — who
  // the teammate actually needs to add and what to expect from them.
  ign?: string | null;
  ignRegion?: string | null;
  ignRank?: string | null;
  ignDivision?: string | null;
  ignRoles?: string[];
}

/**
 * One open invitation in the requests list.
 *
 * The phase above deliberately describes a single order — it drives a modal,
 * and a modal can only be about one thing. This is the other half: everything
 * currently on offer, so a teammate with three invitations in flight can see
 * all three and choose, instead of answering whichever one happened to win
 * the phase precedence.
 */
export interface DispatchRequestView {
  order: DispatchOrderView;
  /** Until this invitation expires. */
  msLeft: number;
  acceptedCount: number;
}

export interface DispatchStateView {
  phase: TeammatePhase;
  order: DispatchOrderView | null;
  msLeft: number;
  candidatePosition: number | null;
  isAutoSelect: boolean;
  acceptedCount: number;
  requests: DispatchRequestView[];
}

type CandidateRow = {
  status: string;
  invitedAt: Date;
  selected: boolean;
  candidatePosition: number | null;
  isAutoSelect: boolean;
  expiresAt: Date | null;
  order: {
    id: string;
    orderNo: number;
    gameSlug: string;
    gameName: string;
    option: string;
    priceEUR: unknown;
    teammatePayoutEUR: unknown;
    customerLabel: string;
    clientUserId: string | null;
    teammatesRequested: number;
    gamesBooked: number;
    vibe: string | null;
    conversationPref: string | null;
    playStylePref: string | null;
    status: string;
    sessionStatus: string | null;
    assignedAt: Date | null;
    ign: string | null;
    ignRegion: string | null;
    ignRank: string | null;
    ignDivision: string | null;
    dispatchDeadline: Date;
    selectionDeadline: Date | null;
    candidates: { status: string; teammateId: string; selected: boolean; isPrimary: boolean }[];
    games: { gameNumber: number; result: string; note: string | null; proofPath: string | null; proofName: string | null }[];
  };
};

function toView(order: CandidateRow["order"]): DispatchOrderView {
  const price = Number(order.priceEUR);
  const primary =
    order.candidates.find((c) => c.selected && c.isPrimary) ?? order.candidates.find((c) => c.selected);
  return {
    id: order.id,
    orderNo: order.orderNo,
    teammateId: primary?.teammateId ?? null,
    gameSlug: order.gameSlug,
    gameName: order.gameName,
    option: order.option,
    priceEUR: price,
    payoutEUR: payoutForOrder(order),
    // Never the raw label: a guest checks out with an email address, and
    // this view goes to the teammate who took the order.
    customerLabel: publicCustomerName({
      customerLabel: order.customerLabel,
      clientUserId: order.clientUserId ?? null,
      orderNo: order.orderNo,
    }),
    teammatesRequested: order.teammatesRequested,
    gamesBooked: order.gamesBooked,
    vibe: order.vibe,
    conversationPref: order.conversationPref,
    playStylePref: order.playStylePref,
    status: order.status,
    sessionStatus: order.sessionStatus,
    assignedAt: order.assignedAt?.getTime() ?? null,
    // The rank is the single most useful thing on an incoming request — it is
    // what tells a teammate whether the order is worth taking at all — so it
    // travels with the invitation, not only with the assigned order.
    ign: order.ign,
    ignRegion: order.ignRegion,
    ignRank: order.ignRank,
    ignDivision: order.ignDivision,
    games: order.games,
  };
}

/**
 * Same precedence as the client machine: an active session beats a pending
 * selection, which beats a fresh invite. Computed server-side so the phase
 * can't be talked into something the DB doesn't agree with.
 */
export function deriveServerPhase(rows: CandidateRow[], available: boolean, now = Date.now()): DispatchStateView {
  return { ...derivePhase(rows, available, now), requests: openRequests(rows, available, now) };
}

/**
 * Every invitation still open to this teammate, soonest to expire first —
 * which is also the order they should be answered in.
 */
function openRequests(rows: CandidateRow[], available: boolean, now: number): DispatchRequestView[] {
  if (!available) return [];
  return rows
    .filter(
      (r) =>
        r.status === "PENDING" &&
        ["SEARCHING", "CANDIDATES_READY", "SELECTING"].includes(r.order.status) &&
        r.invitedAt.getTime() <= now &&
        (!r.expiresAt || r.expiresAt.getTime() > now),
    )
    .map((r) => ({
      order: toView(r.order),
      msLeft: Math.max(0, (r.expiresAt ?? r.order.dispatchDeadline).getTime() - now),
      acceptedCount: r.order.candidates.filter((c) => c.status === "ACCEPTED").length,
    }))
    .sort((a, b) => a.msLeft - b.msLeft);
}

function derivePhase(
  rows: CandidateRow[],
  available: boolean,
  now: number,
): Omit<DispatchStateView, "requests"> {
  const empty: Omit<DispatchStateView, "requests"> = {
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

  if (!available) return { ...empty, phase: "OFFLINE" };

  // A new actionable request must win over an older informational
  // "not selected" result. Otherwise dismissing that result only hides its
  // modal while the stale phase keeps masking every later invitation.
  const incoming = rows.find(
    (r) =>
      r.status === "PENDING" &&
      ["SEARCHING", "CANDIDATES_READY", "SELECTING"].includes(r.order.status) &&
      r.invitedAt.getTime() <= now &&
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

  const passedOver = rows.find(
    (r) => r.status === "ACCEPTED" && !r.selected && ["ASSIGNED", "IN_PROGRESS", "COMPLETED"].includes(r.order.status),
  );
  if (passedOver) {
    return { ...empty, phase: "NOT_SELECTED", order: toView(passedOver.order) };
  }

  return empty;
}
