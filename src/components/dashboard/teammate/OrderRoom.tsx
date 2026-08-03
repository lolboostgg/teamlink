"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PriceTag } from "@/components/currency/PriceTag";
import { SessionChat } from "@/components/matchmaking/SessionChat";
import { conversationKey } from "@/lib/matchmaking/chatStore";
import { gameIcon } from "@/lib/gameArt";
import { getOrder, completeOrder as completeStoreOrder } from "@/lib/matchmaking/store";
import { useCurrentTeammateId } from "@/lib/matchmaking/useCurrentTeammateId";
import {
  useSessionProgress,
  setSessionStatus,
  completeGame,
  completeOrderProgress,
  SESSION_STATUS_LABELS,
  REPORTABLE_STATUSES,
  GAME_RESULT_LABELS,
  RESULTS_REQUIRING_PROOF,
  type GameResult,
  type SessionStatus,
} from "@/lib/matchmaking/sessionProgress";
import { useToast } from "@/components/ui/ToastProvider";
import type { DispatchOrder } from "@/lib/matchmaking/types";

const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const PROOF_TYPES = ["image/jpeg", "image/png", "image/webp"];

function GameCompletionModal({
  gameNumber,
  onClose,
  onSubmit,
}: {
  gameNumber: number;
  onClose: () => void;
  onSubmit: (game: { result: GameResult; note: string; proof: string | null; proofName: string | null }) => void;
}) {
  const [result, setResult] = useState<GameResult>("WIN");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<string | null>(null);
  const [proofName, setProofName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function readFile(file: File) {
    setError(null);
    if (!PROOF_TYPES.includes(file.type)) {
      setError("Screenshots must be JPG, PNG or WEBP.");
      return;
    }
    if (file.size > MAX_PROOF_BYTES) {
      setError("That file is larger than 10 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProof(String(reader.result));
      setProofName(file.name);
    };
    reader.readAsDataURL(file);
  }

  const needsProof = RESULTS_REQUIRING_PROOF.includes(result);

  return (
    <div className="dispatch-modal__backdrop" role="dialog" aria-modal="true">
      <div className="dispatch-modal dispatch-modal--form">
        <h2 className="dispatch-modal__title">Finish game {gameNumber}</h2>

        <div className="form-row">
          <label>Result</label>
          <div className="chip-check-group">
            {(Object.keys(GAME_RESULT_LABELS) as GameResult[]).map((r) => (
              <label key={r} className="chip-check">
                <input type="radio" name="result" checked={result === r} onChange={() => setResult(r)} />
                <span>{GAME_RESULT_LABELS[r]}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-row">
          <label htmlFor="game-note">Note (optional)</label>
          <textarea id="game-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </div>

        <div className="form-row">
          <label>Result screenshot{needsProof ? " *" : " (optional)"}</label>
          <label className="avatar-upload" style={{ cursor: "pointer" }}>
            {proof ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proof} alt="" style={{ maxHeight: 90, borderRadius: 8 }} />
            ) : (
              <span className="avatar-upload__hint">
                <strong>Drag &amp; drop</strong> a screenshot, or click to browse
              </span>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) readFile(file);
              }}
            />
          </label>
          {proofName && <div className="dashboard-panel__sub">{proofName}</div>}
        </div>

        {error && (
          <p className="form-row__error">
            <i className="fa-solid fa-circle-exclamation" aria-hidden="true" /> {error}
          </p>
        )}

        <div className="dispatch-modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Back
          </button>
          <button
            type="button"
            className="btn btn--vivid"
            onClick={() => {
              if (needsProof && !proof) {
                setError("A result screenshot is required for a played game.");
                return;
              }
              onSubmit({ result, note, proof, proofName });
            }}
          >
            Submit result
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderRoom({ orderId }: { orderId: string }) {
  const { showToast } = useToast();
  const teammateId = useCurrentTeammateId();
  const [order, setOrder] = useState<DispatchOrder | null>(null);
  const { progress, refresh } = useSessionProgress(orderId);
  const [finishing, setFinishing] = useState(false);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setOrder(getOrder(orderId));
    const interval = setInterval(() => setOrder(getOrder(orderId)), 2000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (!order) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-circle-question" aria-hidden="true" />
        <p>That order doesn&rsquo;t exist on this device.</p>
      </div>
    );
  }

  // The room is only ever readable by the teammate the order was assigned
  // to — a guessed order id must not open someone else's session.
  if (teammateId && !order.selectedTeammateIds.includes(teammateId)) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-lock" aria-hidden="true" />
        <p>This order isn&rsquo;t assigned to you.</p>
      </div>
    );
  }

  const played = progress?.games.length ?? 0;
  const booked = Math.max(1, order.teammates);
  const allPlayed = played >= booked;
  const isClosed = progress?.status === "ORDER_COMPLETED";

  return (
    <div className="order-room">
      <aside className="order-room__side">
        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Order</div>
              <div className="dashboard-panel__sub">#{order.id.slice(-6)}</div>
            </div>
          </div>

          <div className="order-room__game">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gameIcon(order.gameSlug)} alt="" />
            <div>
              <strong>{order.gameName}</strong>
              <span>{order.option}</span>
            </div>
          </div>

          <dl className="account-facts">
            <div>
              <dt>Customer</dt>
              <dd>{order.customerLabel}</dd>
            </div>
            <div>
              <dt>Games</dt>
              <dd>
                {played} / {booked}
              </dd>
            </div>
            <div>
              <dt>Payout</dt>
              <dd>
                <PriceTag amountEUR={order.priceEUR} />
              </dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{order.assignedAt ? new Date(order.assignedAt).toLocaleTimeString() : "—"}</dd>
            </div>
          </dl>
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Preferences</div>
              <div className="dashboard-panel__sub">What the customer asked for</div>
            </div>
          </div>
          <ul className="order-room__prefs">
            <li>
              <span>Conversation</span>
              {order.conversationPref ?? "No preference"}
            </li>
            <li>
              <span>Play style</span>
              {order.playStylePref ?? "No preference"}
            </li>
            <li>
              <span>Vibe</span>
              {order.vibe ?? "No preference"}
            </li>
          </ul>
        </div>
      </aside>

      <div className="order-room__main">
        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Session</div>
              <div className="dashboard-panel__sub">
                {SESSION_STATUS_LABELS[progress?.status ?? "WAITING_FOR_INVITE"]}
              </div>
            </div>
            {!isClosed && (
              <button type="button" className="btn btn--vivid btn--sm" onClick={() => setFinishing(true)}>
                Finish game {played + 1}
              </button>
            )}
          </div>

          <div className="profile-tabs">
            {REPORTABLE_STATUSES.map((s: SessionStatus) => (
              <button
                key={s}
                type="button"
                className={`profile-tab${progress?.status === s ? " is-active" : ""}`}
                disabled={isClosed}
                onClick={() => {
                  setSessionStatus(orderId, s);
                  refresh();
                }}
              >
                {SESSION_STATUS_LABELS[s]}
              </button>
            ))}
          </div>

          <ol className="session-steps">
            {Array.from({ length: booked }, (_, i) => {
              const game = progress?.games.find((g) => g.gameNumber === i + 1);
              return (
                <li key={i} className={game ? "is-done" : ""}>
                  <span>Game {i + 1}</span>
                  {game ? GAME_RESULT_LABELS[game.result] : "pending"}
                </li>
              );
            })}
          </ol>

          {allPlayed && !isClosed && (
            <div className="teammate-profile-form__actions">
              <button type="button" className="btn btn--vivid" onClick={() => setConfirmingOrder(true)}>
                Complete order
              </button>
            </div>
          )}

          {isClosed && (
            <p className="form-row__hint">
              Order completed — payout is pending review. <Link href="/dashboard/teammate">Back to dashboard</Link>
            </p>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Chat</div>
              <div className="dashboard-panel__sub">Same thread the customer sees</div>
            </div>
          </div>
          <SessionChat
            conversationKey={conversationKey(order.selectedTeammateId ?? "", order.customerLabel)}
            teammateName="you"
            vibe={order.vibe}
            conversationPref={order.conversationPref}
            playStylePref={order.playStylePref}
          />
        </div>
      </div>

      {finishing && (
        <GameCompletionModal
          gameNumber={played + 1}
          onClose={() => setFinishing(false)}
          onSubmit={(game) => {
            const result = completeGame(orderId, { gameNumber: played + 1, ...game });
            if (!result.ok) {
              showToast(result.error, "error");
              return;
            }
            setFinishing(false);
            refresh();
            showToast(`Game ${played + 1} submitted.`, "success");
          }}
        />
      )}

      {confirmingOrder && (
        <div className="dispatch-modal__backdrop" role="dialog" aria-modal="true">
          <div className="dispatch-modal dispatch-modal--form">
            <h2 className="dispatch-modal__title">Complete this order?</h2>
            <dl className="account-facts">
              <div>
                <dt>Games booked</dt>
                <dd>{booked}</dd>
              </div>
              <div>
                <dt>Games completed</dt>
                <dd>{played}</dd>
              </div>
              <div>
                <dt>Proofs uploaded</dt>
                <dd>{progress?.games.filter((g) => g.proof).length ?? 0}</dd>
              </div>
              <div>
                <dt>Payout</dt>
                <dd>
                  <PriceTag amountEUR={order.priceEUR} />
                </dd>
              </div>
            </dl>

            <label className="chip-check">
              <input type="checkbox" checked={confirmed} onChange={() => setConfirmed((v) => !v)} />
              <span>I confirm the booked games were played in full.</span>
            </label>

            <div className="dispatch-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmingOrder(false)}>
                Back
              </button>
              <button
                type="button"
                className="btn btn--vivid"
                disabled={!confirmed}
                onClick={() => {
                  completeOrderProgress(orderId);
                  completeStoreOrder(orderId);
                  setConfirmingOrder(false);
                  refresh();
                  showToast("Order completed.", "success");
                }}
              >
                Complete order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
