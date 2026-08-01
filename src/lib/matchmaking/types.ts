export type CandidateStatus = "pending" | "accepted" | "declined" | "timed_out";

export interface DispatchCandidate {
  teammateId: string;
  status: CandidateStatus;
  // Precomputed once at order creation so the flow resolves deterministically
  // without needing a live timer/backend — see reconcile() in store.ts.
  simulatedRespondAt: number;
  simulatedOutcome: "accepted" | "declined";
  respondedAt?: number;
  manual?: boolean;
}

export type OrderStatus =
  | "searching"
  | "candidates_ready"
  | "selecting"
  | "assigned"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_match";

export interface DispatchOrder {
  id: string;
  gameSlug: string;
  gameName: string;
  option: string;
  priceEUR: number;
  requestedTeammateId: string | null;
  candidates: DispatchCandidate[];
  status: OrderStatus;
  selectedTeammateId: string | null;
  dispatchDeadline: number;
  selectionDeadline: number | null;
  customerLabel: string;
  createdAt: number;
}
