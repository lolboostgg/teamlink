"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatchOrder } from "@/lib/matchmaking/useDispatchOrder";
import { placeReplayCheckout, rerollOrder } from "@/app/actions/checkout";
import { getTeammateById } from "@/lib/teammates";
import { setFavorite, useFavoriteIds } from "@/lib/favorites";
import { submitTeammateReview } from "@/app/actions/reviews";
import { addGames, sendTip, loadTip } from "@/app/actions/sessionExtras";
import { conversationKey, sendChatMessage, useConversationMessages } from "@/lib/matchmaking/chatStore";
import { getLanguageMeta } from "@/lib/i18n";
import { getRankMeta } from "@/lib/lolAssets";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { AvatarIcon } from "@/components/ui/AvatarIcon";
import { PriceTag } from "@/components/currency/PriceTag";
import { Reveal } from "@/components/ui/Reveal";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { SessionChat } from "@/components/matchmaking/SessionChat";
import { PaymentMethodPicker } from "@/components/ui/PaymentMethodPicker";
import { CancelPendingCard } from "@/components/matchmaking/CancelPendingCard";
import type { PaymentMethodKey } from "@/lib/payments";
import { SESSION_STATUS_LABELS, REPORTABLE_STATUSES, sessionStepIndex, type SessionStatus } from "@/lib/dispatch/sessionTypes";
import { OrderNotFound } from "@/components/matchmaking/OrderNotFound";

interface Props {
  orderId: string;
}

const HELP_REASONS = [
  "Teammate did not show up",
  "Teammate was rude, toxic, or inappropriate",
  "Teammate was late or disconnected from the game",
  "Teammate was spamming chat or pings",
  "I had a bad game",
  "Teammate refused voice chat",
  "Teammate took my in-game role",
  "Other",
];

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// The "live session" phase — rendered in place by MatchmakingScreen once a
// teammate has been assigned (no route change: same page, same persistent
// site header throughout the whole order, not the dashboard shell). One
// component drives two phases off the same order: the invite/chat view
// while assigned/in_progress, and the rate + discount + keep-playing view
// once completed.
export function SessionScreen({ orderId }: Props) {
  const router = useRouter();
  const { showToast } = useToast();
  const { order, loaded, now, sessionElapsedSeconds, requestCancelSession } = useDispatchOrder(orderId);
  const completionConversationKey = order?.selectedTeammateId
    ? conversationKey(order.id, order.selectedTeammateId)
    : undefined;
  const { messages: completionMessages } = useConversationMessages(completionConversationKey);
  const favoriteIds = useFavoriteIds();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [rated, setRated] = useState(false);
  const [tipTarget, setTipTarget] = useState<number | null>(null);
  const [tipCustom, setTipCustom] = useState("");
  const [sendingTip, setSendingTip] = useState(false);
  // Both charges used to be hardwired to "card", which ignored a customer
  // sitting on a credits balance.
  const [tipMethod, setTipMethod] = useState<PaymentMethodKey>("card");
  // Defaults to credits for an account, card for a guest — a guest has no
  // balance, so pre-selecting it would guarantee a refusal on submit.
  const { status: authStatus } = useSession();
  const isGuest = authStatus !== "authenticated";
  const [replayMethod, setReplayMethod] = useState<PaymentMethodKey>("credits");
  // Derived rather than reset in an effect: the state's default is written
  // before the session status is known, and a guest must never end up
  // submitting the one method they cannot use.
  const effectiveReplayMethod: PaymentMethodKey =
    isGuest && replayMethod === "credits" ? "card" : replayMethod;
  const [tipSent, setTipSent] = useState<number | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [rerollModalOpen, setRerollModalOpen] = useState(false);
  const [startingReplay, setStartingReplay] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [buyMoreOpen, setBuyMoreOpen] = useState(false);
  const [buyMoreQty, setBuyMoreQty] = useState(1);
  const [buyingMore, setBuyingMore] = useState(false);

  // Same as MatchmakingScreen's copy — a cancellation with cancelApprovedAt
  // set went through the "teammate approves" flow, so send the customer
  // home automatically once it lands, instead of leaving them stranded.
  useEffect(() => {
    if (order?.status !== "cancelled" || order.cancelApprovedAt === null) return;
    const t = setTimeout(() => router.push("/"), 1600);
    return () => clearTimeout(t);
  }, [order?.status, order?.cancelApprovedAt, router]);

  // The reward coupon is minted server-side when the teammate closes the
  // order, so nothing has to be created here any more. This only asks
  // whether a tip was already paid, so a reload doesn't offer the buttons
  // again as if none had been sent.
  useEffect(() => {
    if (order?.status !== "completed") return;
    let cancelled = false;
    void loadTip(order.id).then((tip) => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (tip && !cancelled) setTipSent(tip.amountEUR);
    });
    return () => {
      cancelled = true;
    };
  }, [order?.status, order?.id]);

  // "Not found" and "not fetched yet" both leave order null, and this used to
  // treat them the same — so a reload flashed "we couldn't find that session"
  // at somebody whose session was fine, before replacing it with the session.
  // Only say it once the answer is actually in.
  if (!loaded) {
    return (
      <div className="matching-screen">
        <span className="matching-screen__spinner" aria-hidden="true" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="matching-screen">
        <OrderNotFound subject="session" />
      </div>
    );
  }

  // Mirrors MatchmakingScreen's own cancel_pending/cancelled branches — this
  // bridges the brief gap before the parent's own poll catches up and takes
  // over rendering entirely (see requestCancelSession() below).
  if (order.status === "cancel_pending") {
    return (
      <div className="matching-screen">
        {/* Looked up here rather than reusing `teammate` below — that const
            is declared after this branch. */}
        <CancelPendingCard
          teammateName={
            order.selectedTeammateId ? getTeammateById(order.selectedTeammateId)?.name : null
          }
          refundEUR={order.priceEUR}
        />
      </div>
    );
  }

  if (order.status === "cancelled" && order.cancelApprovedAt !== null) {
    return (
      <div className="matching-screen">
        <span className="matching-screen__spinner matching-screen__spinner--done" aria-hidden="true">
          <i className="fa-solid fa-check" aria-hidden="true" />
        </span>
        <h1 className="matching-screen__title">Session cancelled</h1>
        <p className="matching-screen__sub">Your teammate confirmed the cancellation. Taking you home...</p>
      </div>
    );
  }

  const teammate = order.selectedTeammateId ? getTeammateById(order.selectedTeammateId) : null;
  const favorited = teammate ? favoriteIds.includes(teammate.id) : false;
  const savedRating = rating || order.reviewRating || 0;
  const hasRated = rated || savedRating > 0;
  const liveStatuses: string[] = ["assigned", "in_progress", "completed"];

  if (!teammate || !liveStatuses.includes(order.status)) {
    return (
      <div className="matching-screen">
        <p className="matching-screen__lost">
          This session isn&rsquo;t ready yet. <Link href={`/checkout/matching?order=${order.id}`}>Go back to matching</Link>
        </p>
      </div>
    );
  }

  // No second payment: the reroll carries this booking's price onto the
  // replacement order server-side and cancels this one.
  async function handleReroll() {
    setRerollModalOpen(false);
    setRerolling(true);
    const result = await rerollOrder(order!.id);
    if (!result.ok) {
      setRerolling(false);
      showToast(result.error, "error");
      return;
    }
    router.push(result.redirect);
  }

  function handleConfirmCancel() {
    requestCancelSession();
    setCancelModalOpen(false);
  }


  // Rebooking skips the checkout form — it's the same game, option and price
  // as the session that just ended — but not the payment: the replay is
  // priced from the original order server-side and paid for like any other.
  async function handleKeepPlaying() {
    setStartingReplay(true);
    try {
      const result = await placeReplayCheckout(order!.id, effectiveReplayMethod);
      if (!result.ok) {
        setStartingReplay(false);
        showToast(result.error, "error");
        return;
      }
      if (result.redirect.startsWith("http")) window.location.assign(result.redirect);
      else router.push(result.redirect);
    } catch (err) {
      // A server action that throws rather than returning {ok:false} used to
      // leave this button disabled and reading "Starting…" forever, with
      // nothing said and nothing to look at. Whatever went wrong, the button
      // has to come back.
      console.error("[replay] failed:", err);
      setStartingReplay(false);
      showToast("Couldn't start that session — please try again.", "error");
    }
  }

  function handleHelpReason() {
    setHelpModalOpen(false);
    showToast("Your teammate initiated a refund for your game(s) and we've credited your account.", "success");
  }

  // The price per game is the order's own, worked out server-side — this
  // only says how many. A saved card is charged on the spot; without one the
  // customer finishes on Stripe's page and the webhook adds the games.
  async function handleBuyMore() {
    setBuyingMore(true);
    try {
      const result = await addGames(order!.id, buyMoreQty, "card");
      if (!result.ok) {
        setBuyingMore(false);
        showToast(result.error, "error");
        return;
      }
      if ("redirect" in result) {
        window.location.assign(result.redirect);
        return;
      }
      setBuyingMore(false);
      setBuyMoreOpen(false);
      setBuyMoreQty(1);
      showToast(`Added ${buyMoreQty} more game${buyMoreQty > 1 ? "s" : ""} with ${teammate!.name}!`, "success");
    } catch (err) {
      // Same trap as the tip and replay buttons: a thrown action skipped the
      // line that puts the button back, so it sat on "Adding…" for good.
      console.error("[add-games] failed:", err);
      setBuyingMore(false);
      showToast("Couldn't add those games — please try again.", "error");
    }
  }

  // Both of these only raised a toast at the customer and stopped there —
  // nothing was sent and the teammate never learned anything had happened,
  // while the toast claimed otherwise. They now post to the same thread the
  // teammate is already reading.
  function sendQuickMessage(text: string, toast: string) {
    // Same key SessionChat renders below, so the message lands in the thread
    // that is actually on screen rather than a parallel one.
    sendChatMessage(conversationKey(order!.id, teammate!.id), "client", text);
    showToast(toast, "info");
  }

  function handlePoke() {
    sendQuickMessage("👋 You there?", `Poked ${teammate!.name}.`);
  }

  function handleGG() {
    sendQuickMessage("GG!", `Sent "GG" to ${teammate!.name}.`);
  }

  if (order.status === "completed") {
    const farewellMessage = [...completionMessages].reverse().find((message) => message.from === "teammate");
    return (
      <div className="session-complete">
        <Reveal>
          <div className="session-complete__head">
            <h1 className="session-complete__title">Session complete</h1>
            <p className="session-complete__sub">
              {order.gameName} · {order.option} · <PriceTag amountEUR={order.priceEUR} />
            </p>
          </div>
        </Reveal>

        {farewellMessage && (
          <Reveal delay={40}>
            <div className="session-complete__farewell">
              <span className="session-complete__farewell-avatar"><AvatarIcon seed={teammate.id} avatarUrl={teammate.avatarUrl} frame={teammate} /></span>
              <span><small>{teammate.name}</small><strong>{farewellMessage.text}</strong></span>
            </div>
          </Reveal>
        )}

        <div className="session-complete__grid">
          <Reveal delay={60} className="session-complete__card-wrap">
            <div className="dashboard-panel session-complete__rate">
              <div className="session-complete__review-label">Review your teammate</div>
              <div className="session-complete__teammate-hero">
                <span className="session-complete__hero-avatar">
                  <AvatarIcon seed={teammate.id} avatarUrl={teammate.avatarUrl} frame={teammate} />
                </span>
                <div className="session-complete__teammate-name">{teammate.name}</div>
                <div className="session-complete__teammate-rating">
                  <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(1)} ({teammate.sessions} sessions)
                </div>
              </div>

              <div className="session-complete__stars-block">
                <div className="session-complete__stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                      className="session-complete__star"
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => {
                        setRating(n);
                        setRated(true);
                        void submitTeammateReview(order.id, teammate.id, n).then((result) => {
                          if (!result.ok) showToast(result.error, "error");
                        });
                      }}
                    >
                      <i
                        className={(hoverRating || savedRating) >= n ? "fa-solid fa-star" : "fa-regular fa-star"}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
                <p className="session-complete__stars-note">
                  {hasRated ? (
                    <>
                      <i className="fa-solid fa-circle-check" aria-hidden="true" /> Thanks — your rating was saved.
                    </>
                  ) : (
                    "Your rating is saved to this completed session."
                  )}
                </p>
              </div>

              <div className="session-complete__actions-row">
                <button
                  type="button"
                  className={`btn btn--ghost btn--sm${blocked ? " is-active" : ""}`}
                  onClick={() => setBlocked((v) => !v)}
                >
                  {blocked ? "Blocked" : "Block teammate"}
                </button>
                <button
                  type="button"
                  className={`btn btn--ghost btn--sm${favorited ? " is-active" : ""}`}
                  onClick={() => setFavorite(teammate.id, !favorited)}
                >
                  <i className={favorited ? "fa-solid fa-heart" : "fa-regular fa-heart"} aria-hidden="true" />{" "}
                  {favorited ? "Favorited" : "Mark as favorite"}
                </button>
              </div>

              <div className="session-complete__tip">
                <div className="session-complete__tip-copy">
                  <span className="session-complete__tip-icon" aria-hidden="true">
                    <i className="fa-solid fa-hand-holding-heart" />
                  </span>
                  <span>
                    <strong>Send a tip</strong>
                  </span>
                </div>
                {tipSent !== null ? (
                  <span className="session-complete__tip-sent">
                    <i className="fa-solid fa-circle-check" aria-hidden="true" /> Tip sent · €{tipSent}
                  </span>
                ) : (
                  <div className="session-complete__tip-options">
                    {[1, 2, 3].map((amount) => (
                      <button key={amount} type="button" className="session-complete__tip-btn" onClick={() => setTipTarget(amount)}>
                        {amount}€
                      </button>
                    ))}
                    <button type="button" className="session-complete__tip-btn" onClick={() => setTipTarget(-1)}>
                      Custom
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Reveal>

          <Reveal delay={100} className="session-complete__card-wrap">
            <div className="dashboard-panel session-complete__trustpilot">
              <span className="session-complete__trustpilot-mark">
                <i className="fa-solid fa-star" aria-hidden="true" />
              </span>
              <div className="session-complete__review-label">Review us on Trustpilot</div>
              <div className="session-complete__trustpilot-title">How was your TeamLink experience?</div>
              <p className="session-complete__discount-sub">Your feedback helps players find teammates they can trust.</p>
              <div className="session-complete__stars session-complete__stars--trustpilot">
                {[1, 2, 3, 4, 5].map((n) => (
                  <a key={n} href="https://www.trustpilot.com/evaluate/lolboost.gg" target="_blank" rel="noreferrer" aria-label={`Review TeamLink with ${n} stars`}>
                    <i className="fa-solid fa-star" aria-hidden="true" />
                  </a>
                ))}
              </div>
              <a href="https://www.trustpilot.com/evaluate/lolboost.gg" target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">Open Trustpilot</a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={140}>
          <div className="dashboard-panel session-complete__keep-playing">
            <div className="dashboard-panel__title">Keep playing</div>
            <p className="dashboard-panel__sub">
              Would you like to continue playing with {teammate.name}?
            </p>
            <div className="session-complete__keep-playing-row">
              <PaymentMethodPicker
                value={effectiveReplayMethod}
                onChange={setReplayMethod}
                disabled={startingReplay}
                creditsEnabled={!isGuest}
              />
              <button type="button" className="btn btn--vivid" onClick={handleKeepPlaying} disabled={startingReplay}>
                {startingReplay ? (
                  "Starting…"
                ) : (
                  <>
                    Play again with {teammate.name} · <PriceTag amountEUR={order.priceEUR} />
                  </>
                )}
              </button>
              <Link href="/games" className="btn btn--ghost">
                Not now
              </Link>
            </div>
          </div>
        </Reveal>

        <Modal open={tipTarget !== null} onClose={() => setTipTarget(null)} labelledBy="tip-confirm-title">
          <div className="cancel-confirm">
            <span className="modal-icon modal-icon--accent" aria-hidden="true">
              <i className="fa-solid fa-hand-holding-dollar" />
            </span>
            <h2 id="tip-confirm-title" className="cancel-confirm__title">
              Tip {teammate.name}
            </h2>
            {tipTarget === -1 ? (
              <div className="form-row tip-confirm__custom">
                <label htmlFor="tip-custom-amount">Amount (EUR)</label>
                <input
                  id="tip-custom-amount"
                  type="number"
                  min={1}
                  max={200}
                  step="1"
                  value={tipCustom}
                  onChange={(e) => setTipCustom(e.target.value)}
                  placeholder="5"
                  autoFocus
                />
              </div>
            ) : (
              <p className="cancel-confirm__sub">
                Confirm a <strong>€{tipTarget}</strong> tip — 100% goes to {teammate.name}.
              </p>
            )}
            <div className="pay-picker-row">
              <span>Pay with</span>
              <PaymentMethodPicker
                value={tipMethod}
                onChange={setTipMethod}
                disabled={sendingTip}
                creditsEnabled={!isGuest}
              />
            </div>
            <p className="cancel-confirm__sub tip-confirm__note">
              Credited to {teammate.name} straight away.
            </p>
            <div className="cancel-confirm__actions">
              <button type="button" className="btn btn--ghost btn--block" onClick={() => setTipTarget(null)} disabled={sendingTip}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--vivid btn--block"
                disabled={sendingTip || (tipTarget === -1 && !(Number(tipCustom) > 0))}
                onClick={async () => {
                  const amount = tipTarget === -1 ? Number(tipCustom) : tipTarget!;
                  if (!(amount > 0)) return;
                  setSendingTip(true);
                  try {
                    const result = await sendTip(order.id, amount, tipMethod);
                    if (!result.ok) {
                      setSendingTip(false);
                      showToast(result.error, "error");
                      return;
                    }
                    // No saved card: Stripe's page finishes the payment and
                    // the webhook credits the teammate.
                    if ("redirect" in result) {
                      window.location.assign(result.redirect);
                      return;
                    }
                    setTipSent(amount);
                    setSendingTip(false);
                    setTipTarget(null);
                    showToast(`Tip of €${amount} sent to ${teammate.name}.`, "success");
                  } catch (err) {
                    // Same as the replay button: a thrown action left this
                    // stuck on "Processing payment…" with no way back.
                    console.error("[tip] failed:", err);
                    setSendingTip(false);
                    showToast("Couldn't send that tip — please try again.", "error");
                  }
                }}
              >
                {sendingTip ? "Processing payment..." : `Pay €${tipTarget === -1 ? tipCustom || "0" : tipTarget}`}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    );
  }

  const inSession = order.status === "in_progress";
  const rank = teammate.lolRank ? getRankMeta(teammate.lolRank) : null;
  const rerollSecondsLeft = order.rerollDeadline != null ? Math.max(0, Math.ceil((order.rerollDeadline - now) / 1000)) : 0;
  const canReroll = rerollSecondsLeft > 0;
  const buyMoreTotal = order.priceEUR * buyMoreQty;
  const games = order.games ?? [];
  const gamesBooked = Math.max(1, order.gamesBooked);
  const sessionStatus = (order.sessionStatus ?? "WAITING_FOR_INVITE") as SessionStatus;
  const sessionStatusLabel = SESSION_STATUS_LABELS[sessionStatus] ?? "Waiting for invite";

  return (
    <div className="session-screen">
      <Reveal>
        <div className="session-screen__bar">
          <span>
            <span className="pulse-dot" aria-hidden="true" /> {inSession ? "In session" : "Session start"} ·{" "}
            {formatClock(sessionElapsedSeconds)}
          </span>
          <span className="session-screen__bar-game">
            {order.gameName} · {order.option}
          </span>
        </div>
      </Reveal>

      <div className="session-screen__grid">
        <Reveal delay={60} className="session-screen__side">
          <div className="dashboard-panel session-screen__teammate">
            <h1 className="session-screen__title">
              {order.isReplay ? `You're locked in with ${teammate.name} again` : "Your teammate is inviting you now"}
            </h1>

            <div className="session-screen__profile">
              <span className="session-screen__avatar">
                <AvatarIcon seed={teammate.id} avatarUrl={teammate.avatarUrl} frame={teammate} />
              </span>
              <div className="session-screen__name">{teammate.name}</div>
              <span className="session-screen__badge">
                <i className="fa-solid fa-shield" aria-hidden="true" /> {teammate.sessions >= 100 ? "Pro teammate" : "Teammate"}
              </span>
              <div className="session-screen__stats">
                <span>
                  <strong>{teammate.sessions}</strong> sessions
                </span>
                <span>
                  <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(1)}
                </span>
              </div>
            </div>

            <div className="session-screen__facts">
              <div>
                <span>Game</span>
                <strong>{order.gameName}</strong>
              </div>
              <div>
                <span>Option</span>
                <strong>{order.option}</strong>
              </div>
              <div>
                <span>Region</span>
                <strong>{teammate.timezone}</strong>
              </div>
              <div>
                <span>Languages</span>
                <strong className="session-screen__langs">
                  {teammate.languages.map((lang) => (
                    <FlagIcon key={lang} iso={getLanguageMeta(lang).flagIso} label={getLanguageMeta(lang).label} />
                  ))}
                </strong>
              </div>
            </div>

            {rank && (
              <div className="session-screen__rank">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={rank.icon} alt="" className="session-screen__rank-icon" />
                {rank.label}+
              </div>
            )}

            <p className="session-screen__bio">{teammate.tagline}</p>

            {order.selectedTeammateIds.length > 1 && (
              <div className="session-screen__team">
                <span className="session-screen__team-label">
                  +{order.selectedTeammateIds.length - 1} more teammate{order.selectedTeammateIds.length > 2 ? "s" : ""} on this
                  order — everyone here has chat access and is paid their share
                </span>
                <div className="session-screen__team-list">
                  {order.selectedTeammateIds.slice(1).map((id) => {
                    const t = getTeammateById(id);
                    return (
                      <span className="session-screen__team-chip" key={id}>
                        <span className="session-screen__team-chip-avatar">
                          <AvatarIcon seed={id} avatarUrl={t?.avatarUrl} frame={t ?? undefined} />
                        </span>
                        {t?.name ?? "Teammate"}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="session-screen__buy-more">
              <div className="session-screen__buy-more-head">
                <span>Having a good time?</span>
                <p>Keep the streak going. Add another game with {teammate.name}.</p>
              </div>
              {!buyMoreOpen ? (
                <button type="button" className="btn btn--vivid btn--sm" onClick={() => setBuyMoreOpen(true)}>
                  <i className="fa-solid fa-plus" aria-hidden="true" /> Add games
                </button>
              ) : (
                <div className="session-screen__buy-more-form">
                  <div className="session-screen__buy-more-row">
                    <span>Add more games</span>
                    <div className="booking-stepper">
                      <button type="button" onClick={() => setBuyMoreQty((q) => Math.max(1, q - 1))} aria-label="Decrease">
                        <i className="fa-solid fa-minus" aria-hidden="true" />
                      </button>
                      <span>{buyMoreQty}</span>
                      <button type="button" onClick={() => setBuyMoreQty((q) => Math.min(9, q + 1))} aria-label="Increase">
                        <i className="fa-solid fa-plus" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <button type="button" className="btn btn--vivid btn--block btn--sm" onClick={handleBuyMore} disabled={buyingMore}>
                    {buyingMore ? "Adding..." : <>Checkout · <PriceTag amountEUR={buyMoreTotal} /></>}
                  </button>
                </div>
              )}
            </div>

            <div className="session-screen__buttons">
              {canReroll && (
                <>
                  <button
                    type="button"
                    className="btn btn--ghost btn--block"
                    onClick={() => setRerollModalOpen(true)}
                    disabled={rerolling}
                  >
                    <i className="fa-solid fa-shuffle" aria-hidden="true" /> {rerolling ? "Rerolling..." : "Reroll new teammate"}
                  </button>
                  <span className="session-screen__reroll-note">Available for {formatClock(rerollSecondsLeft)}</span>
                </>
              )}
              <button
                type="button"
                className="btn btn--ghost btn--block session-screen__cancel-btn"
                onClick={() => setCancelModalOpen(true)}
              >
                <i className="fa-solid fa-circle-xmark" aria-hidden="true" /> Ask to cancel session
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80} className="session-screen__progress-wrap">
          {/* Sits above the chat rather than under the teammate card: this is
              the one thing a waiting customer keeps checking, so it belongs
              at the top of the column their eyes are already on. Trimmed to
              the status strip — the stages carry the state on their own. */}
          <div className="dashboard-panel session-screen__progress">
            <div className="session-screen__progress-head">
              <div className="session-screen__progress-status">
                <span className="session-screen__progress-dot" aria-hidden="true" />
                {teammate.name} is <strong>{sessionStatusLabel.toLowerCase()}</strong>
              </div>
              <span className="session-screen__progress-count">
                {games.length}/{gamesBooked} games
              </span>
            </div>

            {/* The same steps the teammate ticks off in their order room, so
                "waiting for invite" reads as a stage of the session rather
                than a status word with no context around it. */}
            <div className="session-steps session-steps--readonly" aria-label={`${teammate.name}'s progress`}>
              {REPORTABLE_STATUSES.map((step, index) => {
                const reached = sessionStepIndex(sessionStatus);
                return (
                  <span
                    key={step}
                    className={`session-step${sessionStatus === step ? " is-active" : ""}${
                      reached > index ? " is-done" : ""
                    }`}
                  >
                    <span className="session-step__dot" aria-hidden="true">
                      {reached > index ? <i className="fa-solid fa-check" /> : index + 1}
                    </span>
                    {SESSION_STATUS_LABELS[step]}
                  </span>
                );
              })}
            </div>

            {/* Per-game results used to be listed here. The customer is
                playing the games — they know how each one went, and being
                told "Game 1 · Win" by the site adds nothing to an evening
                they were present for. The games counter above already says
                how far along the booking is, which is the part they cannot
                see for themselves. */}
          </div>
        </Reveal>

        <Reveal delay={100} className="session-screen__chat-wrap">
          <div className="dashboard-panel session-screen__chat-panel">
            <div className="session-screen__chat-head">
              <span className="session-screen__chat-head-name">{teammate.name}<small>Order #{order.orderNo}</small></span>
              <div className="session-screen__chat-head-actions">
                <button type="button" className="btn btn--ghost btn--sm" onClick={handlePoke}>
                  Poke
                </button>
                <button type="button" className="btn btn--vivid btn--sm" onClick={handleGG}>
                  GG
                </button>
              </div>
            </div>
            {/* The voice bar is gone until there is voice behind it: "Start
                voice" only raised a toast saying an invite had been sent,
                and nothing was. */}
            <SessionChat
              conversationKey={conversationKey(order.id, teammate.id)}
              teammateName={teammate.name}
              customerName={order.customerLabel}
              teammateAvatarUrl={teammate.avatarUrl}
              teammateAvatarFrame={teammate}
              customerAvatarUrl={order.customerAvatarUrl}
              customerAvatarFrame={order.customerAvatarFrame}
              vibe={order.vibe}
              conversationPref={order.conversationPref}
              playStylePref={order.playStylePref}
            />
          </div>
        </Reveal>
      </div>

      <button type="button" className="session-screen__help-fab" onClick={() => setHelpModalOpen(true)}>
        <i className="fa-solid fa-circle-question" aria-hidden="true" /> Need help?
      </button>

      <Modal open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} labelledBy="cancel-session-title">
        <div className="cancel-confirm">
          <span className="modal-icon modal-icon--warning" aria-hidden="true">
            <i className="fa-solid fa-triangle-exclamation" />
          </span>
          <h2 id="cancel-session-title" className="cancel-confirm__title">
            Ask to cancel {order.gameName} · {order.option}
          </h2>
          <p className="cancel-confirm__sub">
            We&rsquo;ll request cancellation from your teammate, who can usually process refunds within minutes.
            Contact our customer support for further assistance or questions.
          </p>
          <div className="cancel-confirm__actions">
            <button type="button" className="btn btn--ghost btn--block" onClick={() => setCancelModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn--danger btn--block" onClick={handleConfirmCancel}>
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={rerollModalOpen} onClose={() => setRerollModalOpen(false)} labelledBy="reroll-session-title">
        <div className="cancel-confirm">
          <span className="modal-icon modal-icon--warning" aria-hidden="true">
            <i className="fa-solid fa-shuffle" />
          </span>
          <h2 id="reroll-session-title" className="cancel-confirm__title">
            Reroll for a new teammate?
          </h2>
          <p className="cancel-confirm__sub">
            This ends your session with {teammate.name} and starts a fresh search. Your existing session stays cancelled
            even if you change your mind afterward.
          </p>
          <div className="cancel-confirm__actions">
            <button type="button" className="btn btn--ghost btn--block" onClick={() => setRerollModalOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn btn--danger btn--block" onClick={handleReroll}>
              Reroll
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={helpModalOpen} onClose={() => setHelpModalOpen(false)} labelledBy="help-modal-title">
        <div className="help-modal">
          <span className="modal-icon modal-icon--accent" aria-hidden="true">
            <i className="fa-solid fa-shield-heart" />
          </span>
          <h2 id="help-modal-title" className="help-modal__title">
            Money-back guarantee
          </h2>
          <p className="help-modal__sub">Let us know what you&rsquo;re having trouble with so we can help.</p>
          <div className="help-modal__list">
            {HELP_REASONS.map((reason) => (
              <button key={reason} type="button" className="help-modal__item" onClick={handleHelpReason}>
                {reason}
                <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
