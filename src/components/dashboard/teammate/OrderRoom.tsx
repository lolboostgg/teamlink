"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PriceTag } from "@/components/currency/PriceTag";
import { SessionChat } from "@/components/matchmaking/SessionChat";
import { conversationKey, sendChatMessage } from "@/lib/matchmaking/chatStore";
import { gameIcon } from "@/lib/gameArt";
import { useToast } from "@/components/ui/ToastProvider";
import { useLiveSync } from "@/lib/events/useLiveSync";
import { FileDrop } from "@/components/ui/FileDrop";
import { PrivateImage } from "@/components/ui/PrivateImage";
import {
  setSessionStatusAction,
  recordGameAction,
  deleteGameAction,
  completeOrderAction,
} from "@/app/dashboard/teammate/dispatchActions";
import {
  SESSION_STATUS_LABELS,
  REPORTABLE_STATUSES,
  GAME_RESULT_LABELS,
  RESULTS_REQUIRING_PROOF,
  sessionStepIndex,
  type GameResult,
  type SessionStatus,
} from "@/lib/dispatch/sessionTypes";
import type { DispatchOrderView } from "@/lib/dispatch/phase";
import { formatRank } from "@/lib/gameRanks";
import { getGameProfileConfig } from "@/lib/gameProfiles";

function GameCompletionModal({
  orderId,
  gameNumber,
  onClose,
  onDone,
}: {
  orderId: string;
  gameNumber: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const [result, setResult] = useState<GameResult>("WIN");
  const [note, setNote] = useState("");
  const [proof, setProof] = useState<{ path: string; name: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsProof = RESULTS_REQUIRING_PROOF.includes(result);

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const body = new FormData();
      body.append("orderId", orderId);
      body.append("gameNumber", String(gameNumber));
      body.append("file", file);
      const res = await fetch("/api/dispatch/proof", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      setProof({ path: data.path, name: data.name });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="dispatch-modal__backdrop" role="dialog" aria-modal="true">
      <div className="dispatch-modal dispatch-modal--form session-finish-modal">
        <div className="session-modal__hero">
          <span><i className="fa-solid fa-flag-checkered" aria-hidden="true" /></span>
          <div><div className="dispatch-modal__eyebrow">Game {gameNumber}</div><h2 className="dispatch-modal__title">Finish session</h2></div>
        </div>

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
          <FileDrop
            accept="image/jpeg,image/png,image/webp"
            label="Drag & drop the result screenshot"
            hint="JPG, PNG or WEBP"
            preview={preview}
            busy={uploading}
            onFile={upload}
          />
          {proof && <div className="dashboard-panel__sub">{proof.name}</div>}
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
            disabled={pending || uploading}
            onClick={() => {
              if (needsProof && !proof) {
                setError("A result screenshot is required for a played game.");
                return;
              }
              startTransition(async () => {
                const res = await recordGameAction(orderId, {
                  gameNumber,
                  result,
                  note,
                  proofPath: proof?.path ?? null,
                  proofName: proof?.name ?? null,
                });
                if (!res.ok) {
                  setError(res.error);
                  return;
                }
                onDone();
              });
            }}
          >
            {pending ? "Submitting…" : "Submit result"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function OrderRoom({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [order, setOrder] = useState<DispatchOrderView | null>(null);
  const [denied, setDenied] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [farewell, setFarewell] = useState("GG!");
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [deletingGame, setDeletingGame] = useState<number | null>(null);
  const completionPromptedFor = useRef<number | null>(null);
  const previousGamesBooked = useRef<number | null>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    const res = await fetch(`/api/dispatch/order/${orderId}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) {
      setDenied(data.error ?? "Couldn't load this order.");
      return;
    }
    setDenied(null);
    if (previousGamesBooked.current !== null && data.gamesBooked > previousGamesBooked.current) {
      const added = data.gamesBooked - previousGamesBooked.current;
      showToast(`${data.customerLabel} booked ${added === 1 ? "one more game" : `${added} more games`}.`, "success");
    }
    previousGamesBooked.current = data.gamesBooked;
    setOrder(data);
  }, [orderId, showToast]);

  useLiveSync("orders", load, 4000, { key: orderId });

  useEffect(() => {
    if (!order || order.status === "COMPLETED" || order.games.length < order.gamesBooked) return;
    if (completionPromptedFor.current === order.gamesBooked) return;
    completionPromptedFor.current = order.gamesBooked;
    setConfirming(true);
  }, [order]);

  async function uploadAndSubmit(file: File) {
    if (!order) return;
    const gameNumber = Array.from({ length: order.gamesBooked }, (_, index) => index + 1)
      .find((number) => !order.games.some((game) => game.gameNumber === number)) ?? order.games.length + 1;
    const objectUrl = URL.createObjectURL(file);
    setUploadPreview(objectUrl);
    setUploadingProof(true);
    try {
      const body = new FormData();
      body.append("orderId", orderId);
      body.append("gameNumber", String(gameNumber));
      body.append("file", file);
      const response = await fetch("/api/dispatch/proof", { method: "POST", body });
      const proof = await response.json();
      if (!response.ok) throw new Error(proof.error ?? "Upload failed.");
      const result = await recordGameAction(orderId, {
        gameNumber,
        result: "WIN",
        proofPath: proof.path,
        proofName: proof.name,
      });
      if (!result.ok) throw new Error(result.error);
      showToast(`Game ${gameNumber} screenshot submitted.`, "success");
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Upload failed.", "error");
    } finally {
      URL.revokeObjectURL(objectUrl);
      setUploadPreview(null);
      setUploadingProof(false);
    }
  }

  async function removeGame(gameNumber: number) {
    setDeletingGame(gameNumber);
    const result = await deleteGameAction(orderId, gameNumber);
    setDeletingGame(null);
    if (!result.ok) return showToast(result.error, "error");
    completionPromptedFor.current = null;
    setConfirming(false);
    await load();
    showToast(`Game ${gameNumber} screenshot removed.`, "success");
  }

  if (denied) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-lock" aria-hidden="true" />
        <p>{denied}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
        <p>Loading the order room…</p>
      </div>
    );
  }

  const played = order.games.length;
  const booked = Math.max(1, order.gamesBooked);
  const isClosed = order.status === "COMPLETED";
  const status = (order.sessionStatus ?? "WAITING_FOR_INVITE") as SessionStatus;

  return (
    <div className="order-room">
      <aside className="order-room__side">
        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Order</div>
              <div className="dashboard-panel__sub">Order #{order.orderNo}</div>
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
                <PriceTag amountEUR={order.payoutEUR} />
              </dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{order.assignedAt ? new Date(order.assignedAt).toLocaleTimeString() : "—"}</dd>
            </div>
            <div>
              <dt>Completed sessions</dt>
              <dd>{order.teammateCompletedSessions ?? 0}</dd>
            </div>
          </dl>
        </div>

        {(order.ign || order.ignRank || (order.ignRoles && order.ignRoles.length > 0)) && (
          <div className="dashboard-panel">
            <div className="dashboard-panel__head">
              <div>
                <div className="dashboard-panel__title">Account</div>
                <div className="dashboard-panel__sub">Who to add in {order.gameName}</div>
              </div>
            </div>
            <dl className="account-facts">
              {order.ign && (
                <div>
                  <dt>In-game name</dt>
                  <dd>{order.ign}</dd>
                </div>
              )}
              {order.ignRegion && (
                <div>
                  <dt>Region</dt>
                  <dd>{order.ignRegion}</dd>
                </div>
              )}
              {/* Both rows stay put even when empty: "Unranked" and "Any" are
                  answers the teammate needs, and hiding the row instead read
                  as the customer never having been asked. */}
              <div>
                <dt>Rank</dt>
                <dd>{formatRank(order.gameSlug, order.ignRank ?? null, order.ignDivision ?? null) || "Unranked"}</dd>
              </div>
              <div>
                <dt>{getGameProfileConfig(order.gameSlug)?.roles?.label ?? "Roles"}</dt>
                <dd>
                  {order.ignRoles && order.ignRoles.length > 0
                    ? order.ignRoles
                        .map((value) => getGameProfileConfig(order.gameSlug)?.roles?.options.find((o) => o.value === value)?.label ?? value)
                        .join(", ")
                    : "Any"}
                </dd>
              </div>
            </dl>
          </div>
        )}

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
        <div className="dashboard-panel order-room__session-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Session</div>
              {/* Spelling out who this is for: the customer's own order screen
                  shows whatever is picked here, live. Without that sentence the
                  strip reads like bookkeeping nobody asked for. */}
              <div className="dashboard-panel__sub">
                <i className="fa-solid fa-eye" aria-hidden="true" /> {order.customerLabel} sees this live — keep it
                current so they know you haven&rsquo;t gone quiet
              </div>
            </div>
            <span className="order-room__proof-count">{played}/{booked} games submitted</span>
          </div>

          <div className="session-steps" role="group" aria-label="What you're doing right now">
            {REPORTABLE_STATUSES.map((s, index) => {
              const reached = sessionStepIndex(status);
              return (
                <button
                  key={s}
                  type="button"
                  className={`session-step${status === s ? " is-active" : ""}${
                    reached > index ? " is-done" : ""
                  }`}
                  disabled={isClosed}
                  onClick={() =>
                    startTransition(async () => {
                      const res = await setSessionStatusAction(orderId, s);
                      if (!res.ok) showToast(res.error, "error");
                      load();
                    })
                  }
                >
                  <span className="session-step__dot" aria-hidden="true">
                    {reached > index ? <i className="fa-solid fa-check" /> : index + 1}
                  </span>
                  {SESSION_STATUS_LABELS[s]}
                </button>
              );
            })}
          </div>

          <div className="order-room__proofs">
            {order.games.map((game) => (
              <div className="order-room__proof" key={game.gameNumber}>
                {game.proofPath ? <PrivateImage
                  src={`/api/dispatch/proof?path=${encodeURIComponent(game.proofPath)}`}
                  name={game.proofName ?? `Game ${game.gameNumber}`}
                  alt={`Game ${game.gameNumber} result`}
                /> : <span className="order-room__proof-placeholder"><i className="fa-solid fa-image" /></span>}
                <span><strong>Game {game.gameNumber}</strong><small>Submitted</small></span>
                {!isClosed && (
                  <button type="button" onClick={() => removeGame(game.gameNumber)} disabled={deletingGame === game.gameNumber} aria-label={`Delete game ${game.gameNumber} screenshot`}>
                    <i className={deletingGame === game.gameNumber ? "fa-solid fa-spinner fa-spin" : "fa-solid fa-trash-can"} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            {!isClosed && played < booked && (
              <div className="order-room__proof-upload">
                <FileDrop
                  accept="image/jpeg,image/png,image/webp"
                  label={`Upload game ${played + 1} screenshot`}
                  hint="Automatically submitted · JPG, PNG or WEBP"
                  preview={uploadPreview}
                  busy={uploadingProof}
                  onFile={uploadAndSubmit}
                />
              </div>
            )}
          </div>

          {isClosed && (
            <p className="form-row__hint">
              Order completed — payout is pending review. <Link href="/dashboard/teammate">Back to dashboard</Link>
            </p>
          )}
        </div>

        <div className="dashboard-panel order-room__chat-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Chat</div>
              <div className="dashboard-panel__sub">Order #{order.orderNo} · Same thread the customer sees</div>
            </div>
          </div>
          <SessionChat
            conversationKey={conversationKey(order.id, order.teammateId ?? "")}
            teammateName={order.teammateName || "You"}
            customerName={order.customerLabel}
            teammateAvatarUrl={order.teammateAvatarUrl}
            customerAvatarUrl={order.customerAvatarUrl}
            teammateAvatarFrame={order.teammateAvatarFrame}
            customerAvatarFrame={order.customerAvatarFrame}
            viewer="teammate"
            vibe={order.vibe}
            conversationPref={order.conversationPref}
            playStylePref={order.playStylePref}
          />
        </div>
      </div>

      {confirming && (
        <div className="dispatch-modal__backdrop" role="dialog" aria-modal="true">
          <div className="dispatch-modal dispatch-modal--form session-complete-modal">
            <div className="session-complete-modal__hero">
              <span className="session-complete-modal__seal" aria-hidden="true">
                <i className="fa-solid fa-flag-checkered" />
              </span>
              <div>
                <div className="dispatch-modal__eyebrow">Order #{order.orderNo} · {order.gameName}</div>
                <h2 className="dispatch-modal__title">Complete this order?</h2>
                <p className="session-complete-modal__lead">
                  This closes the session for {order.customerLabel} and releases your payout for review. It can&rsquo;t
                  be undone.
                </p>
              </div>
              <span className="session-complete-modal__payout">
                <small>Your payout</small>
                <PriceTag amountEUR={order.payoutEUR} />
              </span>
            </div>

            <div className="session-complete-modal__body">
              <div className="session-complete-modal__section">
                <div className="session-complete-modal__section-head">
                  <strong>Games</strong>
                  <span className={played >= booked ? "is-complete" : "is-short"}>
                    <i className={`fa-solid ${played >= booked ? "fa-circle-check" : "fa-circle-exclamation"}`} aria-hidden="true" />
                    {played} of {booked} submitted
                  </span>
                </div>
                <div className="session-complete-modal__proofs">
                  {order.games.map((game) => (
                    <div key={game.gameNumber} className="session-complete-modal__proof">
                      {game.proofPath ? <PrivateImage src={`/api/dispatch/proof?path=${encodeURIComponent(game.proofPath)}`} name={game.proofName ?? `Game ${game.gameNumber}`} alt={`Game ${game.gameNumber}`} /> : <span className="order-room__proof-placeholder"><i className="fa-solid fa-image" /></span>}
                      <span>
                        <strong>Game {game.gameNumber}</strong>
                        <small>{game.proofPath ? "Screenshot attached" : "No screenshot"}</small>
                      </span>
                      <button type="button" onClick={() => removeGame(game.gameNumber)} aria-label={`Delete game ${game.gameNumber}`}><i className="fa-solid fa-trash-can" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <label className="session-confirm-check">
                <input type="checkbox" checked={confirmed} onChange={() => setConfirmed((v) => !v)} />
                <span className="session-confirm-check__box"><i className="fa-solid fa-check" aria-hidden="true" /></span>
                <span><strong>Games played in full</strong><small>I confirm that every booked game was completed.</small></span>
              </label>

              <div className="session-complete-modal__section session-complete-modal__message">
                <div className="session-complete-modal__section-head">
                  <strong>Sign off in the chat</strong>
                  <span>{order.customerLabel} gets this as your last message</span>
                </div>
                <div className="session-farewell-pills">
                  {["GG!", "Nice!", "See ya next time!"].map((message) => <button key={message} type="button" className={farewell === message ? "is-active" : ""} onClick={() => setFarewell(message)}><i className="fa-regular fa-message" aria-hidden="true" />{message}</button>)}
                </div>
                <input
                  type="text"
                  className="session-farewell-custom"
                  value={farewell}
                  onChange={(event) => setFarewell(event.target.value.slice(0, 18))}
                  maxLength={18}
                  placeholder="Or type your own..."
                />
              </div>
            </div>

            <div className="dispatch-modal__actions">
              <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)}>
                Back
              </button>
              <button
                type="button"
                className="btn btn--vivid"
                disabled={!confirmed}
                onClick={() =>
                  startTransition(async () => {
                    sendChatMessage(
                      conversationKey(order.id, order.teammateId ?? ""),
                      "teammate",
                      farewell,
                    );
                    const res = await completeOrderAction(orderId, farewell);
                    if (!res.ok) {
                      showToast(res.error, "error");
                      return;
                    }
                    setConfirming(false);
                    showToast("Order completed.", "success");
                    router.replace("/dashboard/teammate");
                  })
                }
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
