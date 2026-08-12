import type { AvatarFrame } from "@/lib/avatarFrame";
import type { Teammate } from "@/lib/teammates";

export type CandidateStatus = "pending" | "accepted" | "declined" | "timed_out" | "superseded";

export interface DispatchCandidate {
  teammateId: string;
  /** Profile snapshotted from the live database read. This avoids accepted
   * candidates disappearing when the separate public roster cache has not
   * finished loading (or no longer lists a now-busy teammate). */
  teammate?: Teammate;
  status: CandidateStatus;
  // Precomputed once at order creation so the flow resolves deterministically
  // without needing a live timer/backend — see reconcile() in store.ts.
  simulatedRespondAt: number;
  simulatedOutcome: "accepted" | "declined";
  respondedAt?: number;
  manual?: boolean;
}

export type OrderStatus =
  | "awaiting_payment"
  | "searching"
  | "candidates_ready"
  | "selecting"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "cancel_pending"
  | "no_match";

export interface DispatchGame {
  gameNumber: number;
  result: string;
  note: string | null;
  proofPath: string | null;
  proofName: string | null;
  completedAt: number | null;
}

export interface DispatchOrder {
  id: string;
  orderNo: number;
  gameSlug: string;
  gameName: string;
  option: string;
  priceEUR: number;
  unitPriceEUR: number;
  teammates: number;
  gamesBooked: number;
  sessionStatus: string | null;
  // Games the teammate has already submitted, with their result screenshots
  // — the customer sees the same proofs the teammate uploaded.
  games: DispatchGame[];
  reviewRating: number | null;
  requestedTeammateId: string | null;
  candidates: DispatchCandidate[];
  status: OrderStatus;
  // The primary pick — always selectedTeammateIds[0] once assigned, kept
  // as its own field since most of the session UI (chat, profile card,
  // reroll) is built around a single "the" teammate. selectedTeammateIds
  // holds the whole team for orders with teammates > 1.
  selectedTeammateId: string | null;
  selectedTeammateIds: string[];
  dispatchDeadline: number;
  // When the order was actually fanned out to teammates. This — not
  // createdAt — is when the search started: an order is created at the top of
  // checkout and can sit there for minutes while the customer types a card in.
  dispatchedAt: number | null;
  selectionDeadline: number | null;
  // Set once, the moment the order first reaches "assigned" — everything
  // below is computed from this single timestamp (see reconcile() in
  // store.ts): a 2-minute reroll window, the order flipping to
  // "in_progress" at 5 minutes, and an eventual simulated completion.
  assignedAt: number | null;
  rerollDeadline: number | null;
  sessionStartAt: number | null;
  sessionCompleteAt: number | null;
  // True for a "keep playing" order created from a completed session's
  // teammate — lets the UI show a "locked in again" variant instead of the
  // first-time invite copy.
  isReplay: boolean;
  // Set while searching, shown to the teammate once matched — see
  // updatePreferences() in store.ts.
  vibe: string | null;
  conversationPref: string | null;
  playStylePref: string | null;
  // "Ask to cancel" during a live session doesn't cancel immediately — it
  // waits on a simulated teammate approval (see reconcile()) before the
  // order actually moves to "cancelled".
  cancelApprovedAt: number | null;
  customerLabel: string;
  customerAvatarUrl?: string | null;
  customerAvatarFrame?: AvatarFrame | null;
  createdAt: number;
}

// Earliest acceptor — the auto-select candidate the customer sees in the
// middle slot. Kept here now that the localStorage store is gone.
export function firstAcceptedCandidate(candidates: DispatchCandidate[]): DispatchCandidate | undefined {
  return candidates
    .filter((c) => c.status === "accepted")
    .sort((a, b) => (a.respondedAt ?? 0) - (b.respondedAt ?? 0))[0];
}
