// Session vocabulary shared by the server service and the order room. Kept
// free of imports so both a client component and a route handler can use it.

export type SessionStatus =
  | "WAITING_FOR_INVITE"
  | "CONNECTED"
  | "READY"
  | "IN_QUEUE"
  | "IN_GAME"
  | "GAME_FINISHED"
  | "WAITING_FOR_NEXT_GAME"
  | "ORDER_COMPLETION_PENDING"
  | "ORDER_COMPLETED"
  | "CANCEL_REQUESTED";

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  WAITING_FOR_INVITE: "Waiting for invite",
  CONNECTED: "Connected to customer",
  READY: "Ready",
  IN_QUEUE: "In queue",
  IN_GAME: "In game",
  GAME_FINISHED: "Game finished",
  WAITING_FOR_NEXT_GAME: "Waiting for next game",
  ORDER_COMPLETION_PENDING: "Completion pending",
  ORDER_COMPLETED: "Order completed",
  CANCEL_REQUESTED: "Cancellation requested",
};

/** What the teammate sets themselves — the rest are outcomes of an action. */
export const REPORTABLE_STATUSES: SessionStatus[] = [
  "WAITING_FOR_INVITE",
  "CONNECTED",
  "READY",
  "IN_QUEUE",
  "IN_GAME",
];

/**
 * How far along REPORTABLE_STATUSES a session has got, for the step strip both
 * sides draw. Everything after a game has been played counts as past the last
 * step — otherwise submitting a result empties the strip, which reads as the
 * session having gone backwards.
 */
export function sessionStepIndex(status: SessionStatus): number {
  const index = REPORTABLE_STATUSES.indexOf(status);
  if (index >= 0) return index;
  const afterPlaying: SessionStatus[] = [
    "GAME_FINISHED",
    "WAITING_FOR_NEXT_GAME",
    "ORDER_COMPLETION_PENDING",
    "ORDER_COMPLETED",
  ];
  return afterPlaying.includes(status) ? REPORTABLE_STATUSES.length : 0;
}

export type GameResult = "WIN" | "LOSS" | "REMAKE" | "ABORTED" | "CUSTOMER_NO_SHOW" | "TECHNICAL_ISSUE";

export const GAME_RESULT_LABELS: Record<GameResult, string> = {
  WIN: "Win",
  LOSS: "Loss",
  REMAKE: "Remake",
  ABORTED: "Aborted",
  CUSTOMER_NO_SHOW: "Customer didn't show",
  TECHNICAL_ISSUE: "Technical issue",
};

/** Results that stand in for a played game and therefore need a screenshot. */
export const RESULTS_REQUIRING_PROOF: GameResult[] = ["WIN", "LOSS"];
