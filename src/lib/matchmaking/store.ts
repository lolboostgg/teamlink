import { getTeammatesForGame } from "@/lib/teammates";
import type { CandidateStatus, DispatchCandidate, DispatchOrder, OrderStatus } from "@/lib/matchmaking/types";

// No backend to dispatch orders from, so this is the whole "matchmaking
// service" — a localStorage-backed record per order, pushed to other tabs
// of the same browser via BroadcastChannel (genuinely real cross-tab push,
// not a poll). Each candidate also gets a response precomputed once at
// creation time (see createOrder) so the flow always resolves within the
// dispatch window even with nobody on the teammate dashboard to click
// Accept — a real manual response just pre-empts the simulated one.
export const CURRENT_TEAMMATE_ID = "tm-nova";

export const DISPATCH_WINDOW_MS = 20_000;
export const SELECTION_WINDOW_MS = 30_000;
const MAX_CANDIDATES = 5;
const CHANNEL_NAME = "teamlink-dispatch";
const INDEX_KEY = "teamlink:dispatch:index";
const orderKey = (id: string) => `teamlink:dispatch:${id}`;

const TERMINAL_STATUSES: OrderStatus[] = ["completed", "cancelled", "no_match"];

let channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

function broadcast(orderId: string) {
  getChannel()?.postMessage({ type: "update", orderId });
}

export function subscribeToDispatch(onChange: () => void): () => void {
  const ch = getChannel();
  ch?.addEventListener("message", onChange);
  return () => ch?.removeEventListener("message", onChange);
}

function readIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(INDEX_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeIndex(ids: string[]) {
  window.localStorage.setItem(INDEX_KEY, JSON.stringify(ids.slice(-20)));
}

function readOrderRaw(id: string): DispatchOrder | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(orderKey(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DispatchOrder;
  } catch {
    return null;
  }
}

function writeOrder(order: DispatchOrder) {
  window.localStorage.setItem(orderKey(order.id), JSON.stringify(order));
}

export function firstAcceptedCandidate(candidates: DispatchCandidate[]): DispatchCandidate | undefined {
  return candidates
    .filter((c) => c.status === "accepted")
    .sort((a, b) => (a.respondedAt ?? 0) - (b.respondedAt ?? 0))[0];
}

function reconcile(order: DispatchOrder): DispatchOrder {
  const now = Date.now();
  let changed = false;

  const candidates = order.candidates.map((c) => {
    if (c.status !== "pending") return c;
    if (now >= c.simulatedRespondAt) {
      changed = true;
      return { ...c, status: c.simulatedOutcome as CandidateStatus, respondedAt: now };
    }
    if (now >= order.dispatchDeadline) {
      changed = true;
      return { ...c, status: "timed_out" as CandidateStatus, respondedAt: now };
    }
    return c;
  });

  let status = order.status;
  let selectedTeammateId = order.selectedTeammateId;
  let selectionDeadline = order.selectionDeadline;
  let sessionStartAt = order.sessionStartAt;
  let sessionCompleteAt = order.sessionCompleteAt;

  const anyAccepted = candidates.some((c) => c.status === "accepted");
  const allTerminal = candidates.every((c) => c.status !== "pending");

  if ((status === "searching" || status === "candidates_ready") && anyAccepted) {
    changed = true;
    if (order.requestedTeammateId !== null) {
      status = "assigned";
      selectedTeammateId = order.requestedTeammateId;
    } else {
      status = "selecting";
      selectionDeadline = now + SELECTION_WINDOW_MS;
    }
  } else if ((status === "searching" || status === "candidates_ready") && allTerminal && !anyAccepted) {
    changed = true;
    status = "no_match";
  }

  if (status === "selecting" && selectionDeadline !== null && now >= selectionDeadline) {
    const winner = firstAcceptedCandidate(candidates);
    if (winner) {
      changed = true;
      status = "assigned";
      selectedTeammateId = winner.teammateId;
    }
  }

  // Session lifecycle — same precomputed-timestamp pattern as the dispatch
  // candidates: once assigned, schedule a short "connecting" beat before the
  // session is considered live, then a session length before it wraps up.
  // A real manual startOrder()/completeOrder() call (teammate dashboard)
  // simply overwrites status directly and these checks stop firing once
  // status has moved past "assigned"/"in_progress".
  if (status === "assigned" && sessionStartAt === null) {
    changed = true;
    sessionStartAt = now + 2000 + Math.random() * 3000;
    sessionCompleteAt = sessionStartAt + 40000 + Math.random() * 30000;
  }

  if (status === "assigned" && sessionStartAt !== null && now >= sessionStartAt) {
    changed = true;
    status = "in_progress";
  }

  if (status === "in_progress" && sessionCompleteAt !== null && now >= sessionCompleteAt) {
    changed = true;
    status = "completed";
  }

  if (!changed) return order;
  return { ...order, candidates, status, selectedTeammateId, selectionDeadline, sessionStartAt, sessionCompleteAt };
}

export function getOrder(id: string): DispatchOrder | null {
  const raw = readOrderRaw(id);
  if (!raw) return null;
  const reconciled = reconcile(raw);
  if (reconciled !== raw) writeOrder(reconciled);
  return reconciled;
}

export function listActiveOrders(): DispatchOrder[] {
  return readIndex()
    .map((id) => getOrder(id))
    .filter((o): o is DispatchOrder => o !== null && !TERMINAL_STATUSES.includes(o.status));
}

export function createOrder(input: {
  gameSlug: string;
  gameName: string;
  option: string;
  priceEUR: number;
  requestedTeammateId: string | null;
  customerLabel: string;
  // "Keep playing with the same teammate" path — skips the normal
  // 3-18s/65% dice roll so a replay reliably and quickly reconnects you
  // with someone you've just played with, instead of risking a decline.
  forceAcceptFast?: boolean;
  isReplay?: boolean;
}): DispatchOrder | null {
  if (typeof window === "undefined") return null;
  const now = Date.now();

  let pool: string[];
  if (input.requestedTeammateId) {
    pool = [input.requestedTeammateId];
  } else {
    const eligible = getTeammatesForGame(input.gameSlug).map((t) => t.id);
    const novaFirst = eligible.includes(CURRENT_TEAMMATE_ID)
      ? [CURRENT_TEAMMATE_ID, ...eligible.filter((id) => id !== CURRENT_TEAMMATE_ID)]
      : eligible;
    pool = novaFirst.slice(0, MAX_CANDIDATES);
  }

  const candidates: DispatchCandidate[] = pool.map((teammateId) => ({
    teammateId,
    status: "pending",
    simulatedRespondAt: input.forceAcceptFast ? now + 1000 + Math.random() * 2000 : now + 3000 + Math.random() * 15000,
    simulatedOutcome: input.forceAcceptFast ? "accepted" : Math.random() < 0.65 ? "accepted" : "declined",
  }));

  const order: DispatchOrder = {
    id: `ord-${now}-${Math.floor(Math.random() * 10000)}`,
    gameSlug: input.gameSlug,
    gameName: input.gameName,
    option: input.option,
    priceEUR: input.priceEUR,
    requestedTeammateId: input.requestedTeammateId,
    candidates,
    status: "candidates_ready",
    selectedTeammateId: null,
    dispatchDeadline: now + DISPATCH_WINDOW_MS,
    selectionDeadline: null,
    sessionStartAt: null,
    sessionCompleteAt: null,
    isReplay: !!input.isReplay,
    customerLabel: input.customerLabel,
    createdAt: now,
  };

  writeOrder(order);
  writeIndex([...readIndex(), order.id]);
  broadcast(order.id);
  return order;
}

// "Keep playing" from the Session Complete screen — books a fresh order
// with the same teammate, game and option, fast-tracked so it reconnects
// reliably instead of going through the full open-dispatch odds again.
export function createReplayOrder(order: DispatchOrder): DispatchOrder | null {
  if (!order.selectedTeammateId) return null;
  return createOrder({
    gameSlug: order.gameSlug,
    gameName: order.gameName,
    option: order.option,
    priceEUR: order.priceEUR,
    requestedTeammateId: order.selectedTeammateId,
    customerLabel: order.customerLabel,
    forceAcceptFast: true,
    isReplay: true,
  });
}

export function respondToCandidate(orderId: string, teammateId: string, accept: boolean): DispatchOrder | null {
  const order = getOrder(orderId);
  if (!order) return null;
  const now = Date.now();
  const candidates = order.candidates.map((c) =>
    c.teammateId === teammateId && c.status === "pending"
      ? { ...c, status: (accept ? "accepted" : "declined") as CandidateStatus, respondedAt: now, manual: true }
      : c,
  );
  const updated = reconcile({ ...order, candidates });
  writeOrder(updated);
  broadcast(orderId);
  return updated;
}

export function confirmSelection(orderId: string, teammateId: string): DispatchOrder | null {
  const order = getOrder(orderId);
  if (!order || order.status !== "selecting") return order;
  const candidate = order.candidates.find((c) => c.teammateId === teammateId && c.status === "accepted");
  if (!candidate) return order;
  const updated: DispatchOrder = { ...order, status: "assigned", selectedTeammateId: teammateId };
  writeOrder(updated);
  broadcast(orderId);
  return updated;
}

function setStatus(orderId: string, status: OrderStatus): DispatchOrder | null {
  const order = getOrder(orderId);
  if (!order) return null;
  const updated = { ...order, status };
  writeOrder(updated);
  broadcast(orderId);
  return updated;
}

export const startOrder = (orderId: string) => setStatus(orderId, "in_progress");
export const completeOrder = (orderId: string) => setStatus(orderId, "completed");
export const cancelOrder = (orderId: string) => setStatus(orderId, "cancelled");
