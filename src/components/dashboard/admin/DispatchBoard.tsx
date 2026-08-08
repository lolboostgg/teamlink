"use client";

import { useCallback, useEffect, useState } from "react";
import { useLiveSync } from "@/lib/events/useLiveSync";
import { useToast } from "@/components/ui/ToastProvider";
import { GameMark } from "@/components/dashboard/GameMark";
import { formatRank } from "@/lib/gameRanks";
import {
  cancelDispatch,
  extendSelection,
  forceNextWave,
  removeCandidate,
  restartDispatch,
  setMatchingPaused,
} from "@/app/dashboard/admin/dispatch/actions";

/**
 * The live dispatch board.
 *
 * The orders list answers "what happened"; this answers "what is happening",
 * which is a different question and needs a different shape. An order in the
 * queue has no assignee, no session and no outcome yet — all it has is a wave
 * number and a column of teammates in various states of having been asked,
 * and that column is the entire story.
 */

interface Candidate {
  id: string;
  teammateId: string;
  name: string;
  rating: number;
  status: string;
  wave: number;
  delivered: boolean;
  selected: boolean;
  respondedMs: number | null;
}

interface BoardOrder {
  id: string;
  orderNo: number;
  status: string;
  gameSlug: string;
  gameName: string;
  option: string;
  priceEUR: number;
  teammatesRequested: number;
  target: number;
  rank: string | null;
  division: string | null;
  region: string | null;
  ign: string | null;
  wave: number;
  waveDeadline: number | null;
  poolExhaustedAt: number | null;
  matchingPaused: boolean;
  queuedSince: number;
  selectionDeadline: number | null;
  candidates: Candidate[];
}

interface LogEntry {
  id: string;
  type: string;
  message: string;
  at: number;
}

const STATUS_LABEL: Record<string, string> = {
  SEARCHING: "Searching teammates",
  CANDIDATES_READY: "Searching teammates",
  SELECTING: "Customer is picking",
  ASSIGNED: "Assigned",
};

const CANDIDATE_CLASS: Record<string, string> = {
  PENDING: "is-pending",
  ACCEPTED: "is-accepted",
  DECLINED: "is-declined",
  TIMED_OUT: "is-timeout",
  SUPERSEDED: "is-superseded",
};

const CANDIDATE_LABEL: Record<string, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  TIMED_OUT: "Timeout",
  // Not a failure on their part, and the board has to say so — it is the
  // difference between a teammate who ignored us and one who was outraced.
  SUPERSEDED: "Too slow",
};

export function DispatchBoard() {
  const [orders, setOrders] = useState<BoardOrder[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [focus, setFocus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/dispatch${focus ? `?order=${focus}` : ""}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLog(data.log ?? []);
    setLoaded(true);
  }, [focus]);

  // Waves are eight seconds long, so a board that lags by more than a couple
  // of seconds is showing a dispatch that has already moved on.
  useLiveSync("orders", load, 2000);

  // Independent of the fetch: the queue clocks have to keep counting between
  // reads or the board looks frozen.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  async function run(label: string, action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) showToast(result.error ?? "That didn't work.", "error");
    else showToast(label, "success");
    void load();
  }

  if (!loaded) {
    return (
      <div className="dashboard-empty dashboard-empty--compact">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
        <p>Reading the queue&hellip;</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-satellite-dish" aria-hidden="true" />
        <p>Nothing in the dispatcher right now.</p>
        <span className="dashboard-empty__hint">
          Orders appear here the moment they are paid for — before anyone has been matched.
        </span>
      </div>
    );
  }

  return (
    <div className="dispatch-board">
      {orders.map((order) => {
        const accepted = order.candidates.filter((c) => c.status === "ACCEPTED").length;
        const queued = Math.max(0, Math.floor((now - order.queuedSince) / 1000));
        const waveLeft = order.waveDeadline ? Math.max(0, Math.ceil((order.waveDeadline - now) / 1000)) : 0;
        const open = focus === order.id;

        return (
          <article key={order.id} className={`dispatch-order${order.matchingPaused ? " is-paused" : ""}`}>
            <header className="dispatch-order__head">
              <GameMark slug={order.gameSlug} />
              <div className="dispatch-order__ident">
                <div className="dispatch-order__no">#{order.orderNo}</div>
                <div className="dispatch-order__spec">
                  {formatRank(order.gameSlug, order.rank, order.division) ?? "Unranked"}
                  {order.region ? ` · ${order.region.toUpperCase()}` : ""} · {order.option}
                  {order.teammatesRequested > 1 ? ` · ${order.teammatesRequested} teammates` : ""}
                </div>
              </div>

              <div className="dispatch-order__state">
                <span className={`dashboard-pill${order.status === "SELECTING" ? " dashboard-pill--success" : ""}`}>
                  {order.matchingPaused ? "Paused" : (STATUS_LABEL[order.status] ?? order.status)}
                </span>
                <span className="dispatch-order__clock">
                  {formatDuration(queued)} in queue
                  {order.status !== "ASSIGNED" && !order.matchingPaused
                    ? ` · wave ${order.wave}${waveLeft > 0 ? ` (${waveLeft}s)` : ""}`
                    : ""}
                </span>
              </div>

              <div className="dispatch-order__fill">
                <span className="dispatch-order__fill-value">
                  {accepted}/{order.target}
                </span>
                <span className="dispatch-order__fill-label">accepted</span>
              </div>
            </header>

            {order.poolExhaustedAt && (
              <div className="dispatch-order__note">
                Everyone eligible has been asked — starting over shortly. Widen the teammate&rsquo;s rank ceilings or
                regions if this keeps repeating.
              </div>
            )}

            <ul className="dispatch-candidates">
              {order.candidates.length === 0 && <li className="dispatch-candidates__empty">Nobody invited yet.</li>}
              {order.candidates.map((candidate) => (
                <li key={candidate.id} className={`dispatch-candidate ${CANDIDATE_CLASS[candidate.status] ?? ""}`}>
                  <span className="dispatch-candidate__wave">W{candidate.wave}</span>
                  <span className="dispatch-candidate__name">
                    {candidate.name}
                    {candidate.selected && <span className="dispatch-candidate__tag">on the order</span>}
                  </span>
                  <span className="dispatch-candidate__status">{CANDIDATE_LABEL[candidate.status] ?? candidate.status}</span>
                  <span className="dispatch-candidate__meta">
                    {/* Whether the alert reached them at all is the first
                        thing to check when someone "never responds". */}
                    {candidate.status === "TIMED_OUT" && !candidate.delivered && "alert never confirmed"}
                    {candidate.respondedMs !== null && `${(candidate.respondedMs / 1000).toFixed(1)}s`}
                  </span>
                  <button
                    type="button"
                    className="dispatch-candidate__remove"
                    disabled={busy}
                    title="Remove from this order"
                    onClick={() => run("Removed.", () => removeCandidate(order.id, candidate.teammateId))}
                  >
                    <i className="fa-solid fa-xmark" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>

            <footer className="dispatch-order__actions">
              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => run("Wave sent.", () => forceNextWave(order.id))}>
                Send next wave
              </button>
              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => run("Dispatch restarted.", () => restartDispatch(order.id))}>
                Restart dispatch
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                disabled={busy}
                onClick={() => run(order.matchingPaused ? "Resumed." : "Paused.", () => setMatchingPaused(order.id, !order.matchingPaused))}
              >
                {order.matchingPaused ? "Resume matching" : "Pause matching"}
              </button>
              {order.status === "SELECTING" && (
                <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => run("Extended.", () => extendSelection(order.id, 60))}>
                  +60s to pick
                </button>
              )}
              <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => setFocus(open ? null : order.id)}>
                {open ? "Hide log" : "Dispatch log"}
              </button>
              <button type="button" className="btn btn--danger btn--sm" disabled={busy} onClick={() => run("Cancelled.", () => cancelDispatch(order.id))}>
                Cancel order
              </button>
            </footer>

            {open && (
              <ol className="dispatch-log">
                {log.length === 0 && <li className="dispatch-log__empty">No entries yet.</li>}
                {log.map((entry) => (
                  <li key={entry.id} className={`dispatch-log__row is-${entry.type}`}>
                    <span className="dispatch-log__time">{new Date(entry.at).toLocaleTimeString()}</span>
                    <span className="dispatch-log__message">{entry.message}</span>
                  </li>
                ))}
              </ol>
            )}
          </article>
        );
      })}
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}
