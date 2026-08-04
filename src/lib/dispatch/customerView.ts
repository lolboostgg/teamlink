import type { DispatchOrder, CandidateStatus, OrderStatus } from "@/lib/matchmaking/types";

// The customer screens were written against the old localStorage record, so
// the API hands back that exact shape — lowercase statuses, epoch millis —
// rather than forcing a rewrite of MatchmakingScreen and SessionScreen.

const ORDER_STATUS: Record<string, OrderStatus> = {
  SEARCHING: "searching",
  CANDIDATES_READY: "candidates_ready",
  SELECTING: "selecting",
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  CANCEL_PENDING: "cancel_pending",
  NO_MATCH: "no_match",
};

const CANDIDATE_STATUS: Record<string, CandidateStatus> = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  TIMED_OUT: "timed_out",
};

type Row = {
  id: string;
  orderNo: number;
  gameSlug: string;
  gameName: string;
  option: string;
  priceEUR: unknown;
  teammatesRequested: number;
  gamesBooked: number;
  sessionStatus: string | null;
  requestedTeammateId: string | null;
  status: string;
  dispatchDeadline: Date;
  selectionDeadline: Date | null;
  assignedAt: Date | null;
  rerollDeadline: Date | null;
  sessionStartAt: Date | null;
  sessionCompleteAt: Date | null;
  isReplay: boolean;
  vibe: string | null;
  conversationPref: string | null;
  playStylePref: string | null;
  cancelApprovedAt: Date | null;
  customerLabel: string;
  clientUser?: { avatarUrl: string | null } | null;
  createdAt: Date;
  candidates: {
    teammateId: string;
    status: string;
    respondedAt: Date | null;
    manual: boolean;
    selected: boolean;
    isPrimary: boolean;
  }[];
  review?: { rating: number } | null;
};

export function toCustomerOrder(row: Row): DispatchOrder {
  const selected = row.candidates.filter((c) => c.selected);
  const primary = selected.find((c) => c.isPrimary) ?? selected[0];

  return {
    id: row.id,
    orderNo: row.orderNo,
    gameSlug: row.gameSlug,
    gameName: row.gameName,
    option: row.option,
    priceEUR: Number(row.priceEUR),
    teammates: row.teammatesRequested,
    gamesBooked: row.gamesBooked,
    sessionStatus: row.sessionStatus,
    reviewRating: row.review?.rating ?? null,
    requestedTeammateId: row.requestedTeammateId,
    candidates: row.candidates.map((c) => ({
      teammateId: c.teammateId,
      status: CANDIDATE_STATUS[c.status] ?? "pending",
      // Simulation-only fields the customer UI never reads; kept so the
      // shared type doesn't need a second variant.
      simulatedRespondAt: 0,
      simulatedOutcome: "accepted",
      respondedAt: c.respondedAt?.getTime(),
      manual: c.manual,
    })),
    status: ORDER_STATUS[row.status] ?? "searching",
    selectedTeammateId: primary?.teammateId ?? null,
    selectedTeammateIds: selected.map((c) => c.teammateId),
    dispatchDeadline: row.dispatchDeadline.getTime(),
    selectionDeadline: row.selectionDeadline?.getTime() ?? null,
    assignedAt: row.assignedAt?.getTime() ?? null,
    rerollDeadline: row.rerollDeadline?.getTime() ?? null,
    sessionStartAt: row.sessionStartAt?.getTime() ?? null,
    sessionCompleteAt: row.sessionCompleteAt?.getTime() ?? null,
    isReplay: row.isReplay,
    vibe: row.vibe,
    conversationPref: row.conversationPref,
    playStylePref: row.playStylePref,
    cancelApprovedAt: row.cancelApprovedAt?.getTime() ?? null,
    customerLabel: row.customerLabel,
    customerAvatarUrl: row.clientUser?.avatarUrl ?? null,
    createdAt: row.createdAt.getTime(),
  };
}
