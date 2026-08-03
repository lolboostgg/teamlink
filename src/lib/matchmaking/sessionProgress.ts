"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-order session progress the teammate drives: the status they report and
 * the games they've closed out with a result and a proof screenshot. Same
 * localStorage + BroadcastChannel architecture as the dispatch and chat
 * stores, so the whole flow behaves identically until there's a backend.
 */
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

/** What the teammate can set themselves — the rest are outcomes of an action. */
export const REPORTABLE_STATUSES: SessionStatus[] = [
  "WAITING_FOR_INVITE",
  "CONNECTED",
  "READY",
  "IN_QUEUE",
  "IN_GAME",
];

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

export interface SessionGame {
  gameNumber: number;
  result: GameResult;
  note: string;
  /** Data URL of the uploaded screenshot — no bucket for these yet. */
  proof: string | null;
  proofName: string | null;
  completedAt: number;
}

export interface SessionProgress {
  orderId: string;
  status: SessionStatus;
  games: SessionGame[];
  startedAt: number | null;
  completedAt: number | null;
}

const KEY = "teamlink:session-progress";
const CHANNEL_NAME = "teamlink-session";
let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

function readAll(): Record<string, SessionProgress> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, SessionProgress>) {
  window.localStorage.setItem(KEY, JSON.stringify(all));
  getChannel()?.postMessage({ type: "session-updated" });
}

export function emptyProgress(orderId: string): SessionProgress {
  return { orderId, status: "WAITING_FOR_INVITE", games: [], startedAt: null, completedAt: null };
}

export function getProgress(orderId: string): SessionProgress {
  return readAll()[orderId] ?? emptyProgress(orderId);
}

function patch(orderId: string, change: Partial<SessionProgress>): SessionProgress {
  const all = readAll();
  const next = { ...(all[orderId] ?? emptyProgress(orderId)), ...change };
  all[orderId] = next;
  writeAll(all);
  return next;
}

export function setSessionStatus(orderId: string, status: SessionStatus): SessionProgress {
  const current = getProgress(orderId);
  return patch(orderId, {
    status,
    startedAt: current.startedAt ?? (status === "IN_GAME" ? Date.now() : current.startedAt),
  });
}

/**
 * Records one finished game. Refuses to write the same game number twice —
 * a double submit would otherwise inflate the count past what was booked.
 */
export function completeGame(
  orderId: string,
  game: Omit<SessionGame, "completedAt">,
): { ok: true; progress: SessionProgress } | { ok: false; error: string } {
  const current = getProgress(orderId);
  if (current.games.some((g) => g.gameNumber === game.gameNumber)) {
    return { ok: false, error: "That game was already submitted." };
  }
  if (RESULTS_REQUIRING_PROOF.includes(game.result) && !game.proof) {
    return { ok: false, error: "A result screenshot is required for a played game." };
  }

  const progress = patch(orderId, {
    games: [...current.games, { ...game, completedAt: Date.now() }],
    status: "WAITING_FOR_NEXT_GAME",
    startedAt: current.startedAt ?? Date.now(),
  });
  return { ok: true, progress };
}

export function completeOrderProgress(orderId: string): SessionProgress {
  return patch(orderId, { status: "ORDER_COMPLETED", completedAt: Date.now() });
}

export function useSessionProgress(orderId: string | null) {
  const [progress, setProgress] = useState<SessionProgress | null>(null);

  const refresh = useCallback(() => {
    setProgress(orderId ? getProgress(orderId) : null);
  }, [orderId]);

  useEffect(() => {
    refresh();
    const ch = getChannel();
    ch?.addEventListener("message", refresh);
    return () => ch?.removeEventListener("message", refresh);
  }, [refresh]);

  return { progress, refresh };
}
