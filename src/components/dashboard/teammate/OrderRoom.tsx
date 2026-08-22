"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PriceTag } from "@/components/currency/PriceTag";
import { SessionChat } from "@/components/matchmaking/SessionChat";
import { conversationKey, sendChatMessage } from "@/lib/matchmaking/chatStore";
import { gameIcon } from "@/lib/gameArt";
import { playSound } from "@/lib/notificationSound";
import { useToast } from "@/components/ui/ToastProvider";
import { useLiveSync } from "@/lib/events/useLiveSync";
import { FileDrop } from "@/components/ui/FileDrop";
import { PrivateImage } from "@/components/ui/PrivateImage";
import {
  setSessionStatusAction,
  recordGameAction,
  deleteGameAction,
  completeOrderAction,
  respondToCancelAction,
} from "@/app/dashboard/teammate/dispatchActions";
import { CancelRequestModal } from "@/components/dashboard/teammate/CancelRequestModal";
import { HandoverPanel } from "@/components/dashboard/teammate/HandoverPanel";
import {
  SESSION_STATUS_LABELS,
  REPORTABLE_STATUSES,
  sessionStepIndex,
  type SessionStatus,
} from "@/lib/dispatch/sessionTypes";
import type { DispatchOrderView } from "@/lib/dispatch/phase";
import { formatRank } from "@/lib/gameRanks";
import { getGameProfileConfig } from "@/lib/gameProfiles";

// Where a teammate lands once an order is off their plate — the queue, not
// the overview.
const NEXT_ORDER_HREF = "/dashboard/teammate/requests";

/**
 * A value you are meant to paste somewhere else.
 *
 * The in-game name exists to be typed into a game client, and retyping a
 * Riot ID by eye from a second monitor is how a teammate ends up adding the
 * wrong person. One click, and the confirmation is the label itself so it
 * needs no space of its own.
 */
function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <button
      type="button"
      className={`order-room__copy${copied ? " is-copied" : ""}`}
      title="Copy to clipboard"
      onClick={() => {
        // Clipboard access is refused outside a secure context and in some
        // embedded browsers. Nothing to recover here — the value is on screen
        // either way, so the click simply does nothing rather than erroring.
        void navigator.clipboard?.writeText(value).then(() => setCopied(true)).catch(() => {});
      }}
    >
      <span>{value}</span>
      <i className={copied ? "fa-solid fa-check" : "fa-regular fa-copy"} aria-hidden="true" />
    </button>
  );
}

/**
 * Ranks and lanes as their own art rather than a list of words.
 *
 * Five lane names do not fit the column and were being cut off mid-word —
 * "Jungle, Mid, ADC, S…" tells a teammate less than five icons do, and these
 * are marks people already read at a glance in the game itself. The label
 * stays as the tooltip, and anything without art falls back to its name so a
 * game we have no icons for still reads.
 */
function OptionMarks({
  gameSlug,
  section,
  values,
  empty,
  suffix,
}: {
  gameSlug: string;
  section: "ranks" | "roles";
  values: string[];
  empty: string;
  suffix?: string;
}) {
  if (values.length === 0) return <>{empty}</>;
  const options = getGameProfileConfig(gameSlug)?.[section]?.options ?? [];

  return (
    <span className="order-room__marks">
      {values.map((value) => {
        const option = options.find((o) => o.value === value);
        const label = option?.label ?? value;
        if (option?.icon) {
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={value} src={option.icon} alt={label} title={label} />;
        }
        if (option?.glyph) return <i key={value} className={option.glyph} title={label} aria-hidden="true" />;
        return (
          <span key={value} className="order-room__marks-text">
            {label}
          </span>
        );
      })}
      {suffix && <span className="order-room__marks-text">{suffix}</span>}
    </span>
  );
}

export function OrderRoom({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [order, setOrder] = useState<DispatchOrderView | null>(null);
  // A cancellation request pauses the session until the teammate answers, so
  // it must not wait to be noticed. Once per order, hence the ref.
  const announcedCancel = useRef<string | null>(null);
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
  const [cancelPending, setCancelPending] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/dispatch/order/${orderId}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
      });
      const data = await res.json();
      if (!res.ok) {
        setDenied(data.error ?? "Couldn't load this order.");
        return;
      }
      setDenied(null);
      setLoadError(null);
      if (previousGamesBooked.current !== null && data.gamesBooked > previousGamesBooked.current) {
        const added = data.gamesBooked - previousGamesBooked.current;
        showToast(`${data.customerLabel} booked ${added === 1 ? "one more game" : `${added} more games`}.`, "success");
      }
      previousGamesBooked.current = data.gamesBooked;
      setOrder(data);
    } catch (error) {
      setLoadError(error instanceof DOMException && error.name === "TimeoutError"
        ? "The order room is taking too long to respond."
        : "The order room could not be loaded.");
    }
  }, [orderId, showToast]);

  useLiveSync("orders", load, 4000, { key: orderId });

  useEffect(() => {
    if (order?.status !== "CANCEL_PENDING") return;
    if (announcedCancel.current === order.id) return;
    announcedCancel.current = order.id;
    playSound("cancel");
  }, [order?.status, order?.id]);

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
    if (loadError) {
      return (
        <div className="dashboard-empty">
          <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          <p>{loadError}</p>
          <button type="button" className="btn btn--vivid btn--sm" onClick={() => void load()}>Try again</button>
        </div>
      );
    }
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
        <p>Loading the order room…</p>
      </div>
    );
  }

  async function respondToCancel(approve: boolean) {
    setCancelPending(true);
    const res = await respondToCancelAction(orderId, approve);
    setCancelPending(false);
    if (!res.ok) {
      showToast(res.error, "error");
      return;
    }
    if (approve) {
      showToast("Session cancelled.", "success");
      router.replace(NEXT_ORDER_HREF);
      return;
    }
    showToast("Cancellation declined — the session continues.", "info");
    void load();
  }

  const played = order.games.length;
  const booked = Math.max(1, order.gamesBooked);
  const isClosed = order.status === "COMPLETED";
  const status = (order.sessionStatus ?? "WAITING_FOR_INVITE") as SessionStatus;

  return (
    <>
      {/* The customer's request used to land in the database and stop there:
          nothing here surfaced it, so the order sat in CANCEL_PENDING and
          they waited on a confirmation no one could give. Sits above the
          room's grid, which has a fixed height and only two columns. */}
      {order.status === "CANCEL_PENDING" && (
        <CancelRequestModal
          customerName={order.customerLabel}
          // Only the games they will not get. Mirrors owedCents() in
          // lib/orderRefunds, which is what actually moves the money — the
          // modal used to promise the whole price back regardless of how
          // much of the session had already been delivered.
          refundEUR={(order.priceEUR * (booked - Math.min(played, booked))) / booked}
          keepEUR={(order.payoutEUR * Math.min(played, booked)) / booked}
          played={played}
          booked={booked}
          pending={cancelPending}
          onApprove={() => respondToCancel(true)}
          onDecline={() => respondToCancel(false)}
        />
      )}

      <div className="order-room">
      {/* One panel, not three. Order / Account / Preferences were three
          cards each with its own header, subtitle and padding — three
          headings of chrome around about fifteen short values, which is
          what pushed the chat off the screen. They are sections of the
          same brief now, divided by a hairline. */}
      <aside className="order-room__side">
        {/* Two cards, mirroring the rows on the right: this one sits beside
            Session, the one below fills the rest like the chat does. The
            column used to end halfway down, leaving the page lopsided. */}
        <div className="dashboard-panel order-room__brief">
          <div className="order-room__game">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gameIcon(order.gameSlug)} alt="" />
            <div>
              <strong>{order.gameName}</strong>
              <span>{order.option}</span>
            </div>
            <span className="order-room__payout">
              <PriceTag amountEUR={order.payoutEUR} />
              <small>payout</small>
            </span>
          </div>

          <dl className="order-room__facts">
            <div>
              <dt>Order</dt>
              <dd>#{order.orderNo}</dd>
            </div>
            <div>
              <dt>Customer</dt>
              <dd title={order.customerLabel}>{order.customerLabel}</dd>
            </div>
            <div>
              <dt>Games</dt>
              <dd>
                {played} / {booked}
              </dd>
            </div>
            <div>
              <dt>Started</dt>
              <dd>{order.assignedAt ? new Date(order.assignedAt).toLocaleTimeString() : "—"}</dd>
            </div>
          </dl>

        </div>

        <div className="dashboard-panel order-room__brief order-room__brief--fill">
          {(order.ign || order.ignRank || (order.ignRoles && order.ignRoles.length > 0)) && (
            <>
              <div className="order-room__section order-room__section--first">Who to add</div>
              <dl className="order-room__facts">
                {order.ign && (
                  <div>
                    <dt>In-game name</dt>
                    <dd>
                      <CopyValue value={order.ign} />
                    </dd>
                  </div>
                )}
                {order.ignRegion && (
                  <div>
                    <dt>Region</dt>
                    <dd>{order.ignRegion}</dd>
                  </div>
                )}
                {/* Both rows stay put even when empty: "Unranked" and "Any"
                    are answers the teammate needs, and hiding the row read as
                    the customer never having been asked. */}
                <div>
                  <dt>Rank</dt>
                  {/* The division is not a tier of its own and has no art of
                      its own — it rides along with the emblem it belongs to. */}
                  <dd>
                    <OptionMarks
                      gameSlug={order.gameSlug}
                      section="ranks"
                      // An unstated rank is Unranked, and Unranked is a real
                      // rung on every ladder here with art of its own — left
                      // as bare text it was the one row that looked like
                      // missing data rather than an answer.
                      values={[order.ignRank || "unranked"]}
                      empty="Unranked"
                      suffix={
                        formatRank(order.gameSlug, order.ignRank ?? "unranked", order.ignDivision ?? null) ??
                        undefined
                      }
                    />
                  </dd>
                </div>
                <div>
                  <dt>{getGameProfileConfig(order.gameSlug)?.roles?.label ?? "Roles"}</dt>
                  <dd>
                    <OptionMarks
                      gameSlug={order.gameSlug}
                      section="roles"
                      values={order.ignRoles ?? []}
                      empty="Any"
                    />
                  </dd>
                </div>
              </dl>
            </>
          )}

          <div className="order-room__section">What they asked for</div>
          {/* Chips rather than label/value rows: three preferences that are
              usually "No preference" do not each deserve a line of their
              own. */}
          <div className="order-room__pref-chips">
            <span>{order.conversationPref ?? "No preference"}</span>
            <span>{order.playStylePref ?? "No preference"}</span>
            <span className="order-room__pref-chips--vibe">{order.vibe ?? "No vibe set"}</span>
          </div>

          {/* The column ran out of content halfway down, and the things that
              belong in the leftover space are the ones nobody looks up until
              it is too late: what to do when the customer doesn't show, and
              the rules that decide whether an order gets paid out. */}
          <div className="order-room__section">Running this order</div>
          <ul className="order-room__rules">
            <li>
              <i className="fa-solid fa-user-plus" aria-hidden="true" />
              <span>Add them in-game, then say hello here. Keep it in this chat — it&rsquo;s the record.</span>
            </li>
            <li>
              <i className="fa-solid fa-camera" aria-hidden="true" />
              <span>Screenshot every game. Payouts are released against those.</span>
            </li>
            <li>
              <i className="fa-solid fa-hourglass-half" aria-hidden="true" />
              <span>No-show? Message them, wait 15 minutes, then ask support — don&rsquo;t cancel it yourself.</span>
            </li>
          </ul>

          <a
            className="order-room__help"
            href="https://discord.com/channels/1535592539195703398/1535592539997081668"
            target="_blank"
            rel="noreferrer"
          >
            <i className="fa-solid fa-headset" aria-hidden="true" />
            Something wrong with this order?
          </a>
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
                <i className="fa-solid fa-eye" aria-hidden="true" /> {order.customerLabel}
                {" sees this live — keep it current so they know you haven’t gone quiet"}
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

          {order.status === "ASSIGNED" && status === "WAITING_FOR_INVITE" && (
            <HandoverPanel orderId={orderId} />
          )}

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

          {/* It used to say "payout is pending review", which had teammates
              waiting on an approval that was never coming — the balance is
              credited the moment the order closes. What needs asking for is
              the withdrawal, and that is a different screen. */}
          {isClosed && (
            <p className="form-row__hint">
              Order completed — your share is on your balance already.{" "}
              <Link href="/dashboard/teammate/payments">Request a payout</Link>
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
                <div className="session-farewell-field">
                  <i className="fa-solid fa-pen" aria-hidden="true" />
                  <input
                    type="text"
                    value={farewell}
                    onChange={(event) => setFarewell(event.target.value.slice(0, 18))}
                    maxLength={18}
                    placeholder="Write custom message…"
                    aria-label="Custom sign-off message"
                  />
                  <span className="session-farewell-field__count">{farewell.length}/18</span>
                </div>
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
                    // Straight back to the queue, not the overview. A teammate
                    // who just finished is the one most likely to take the
                    // next order, and the overview is a page they have to
                    // leave again before they can.
                    router.replace(NEXT_ORDER_HREF);
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
    </>
  );
}
