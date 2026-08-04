"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatchOrder } from "@/lib/matchmaking/useDispatchOrder";
import { placeOrder, placeReplayOrder } from "@/lib/matchmaking/createOrderClient";
import { getTeammateById } from "@/lib/teammates";
import { setFavorite, useFavoriteIds } from "@/lib/favorites";
import { submitTeammateReview } from "@/app/actions/reviews";
import { addTip, getTipForOrder } from "@/lib/tips";
import { addCoupon } from "@/lib/coupons";
import { conversationKey } from "@/lib/matchmaking/chatStore";
import { spendCredits } from "@/app/actions/credits";
import { getLanguageMeta } from "@/lib/i18n";
import { getRankMeta } from "@/lib/lolAssets";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { AvatarIcon } from "@/components/ui/AvatarIcon";
import { PriceTag } from "@/components/currency/PriceTag";
import { Reveal } from "@/components/ui/Reveal";
import { Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { SessionChat } from "@/components/matchmaking/SessionChat";

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

function discountCodeFor(orderId: string): string {
  const clean = orderId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `TL10-${clean.slice(-6)}`;
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
  const { order, now, sessionElapsedSeconds, cancelOrder, requestCancelSession } = useDispatchOrder(orderId);
  const favoriteIds = useFavoriteIds();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [rated, setRated] = useState(false);
  const [tipTarget, setTipTarget] = useState<number | null>(null);
  const [tipCustom, setTipCustom] = useState("");
  const [sendingTip, setSendingTip] = useState(false);
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

  // Turns the discount code shown below into a real, checkout-redeemable
  // coupon the moment this screen appears (addCoupon is idempotent by
  // code), and restores tip-sent state from the real tip store so a reload
  // doesn't show the tip buttons as if nothing had been sent yet.
  useEffect(() => {
    if (order?.status !== "completed") return;
    addCoupon(discountCodeFor(order.id), 10, order.id);
    const existingTip = getTipForOrder(order.id);
    // Restores tip-sent state from the real store on reload — a
    // necessary sync with external (localStorage) state, not avoidable
    // via lazy initial state since `order` itself only resolves async.
    if (existingTip) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTipSent(existingTip.amountEUR);
    }
  }, [order?.status, order?.id]);

  if (!order) {
    return (
      <div className="matching-screen">
        <p className="matching-screen__lost">
          We couldn&rsquo;t find that session. <Link href="/games">Back to games</Link>
        </p>
      </div>
    );
  }

  // Mirrors MatchmakingScreen's own cancel_pending/cancelled branches — this
  // bridges the brief gap before the parent's own poll catches up and takes
  // over rendering entirely (see requestCancelSession() below).
  if (order.status === "cancel_pending") {
    return (
      <div className="matching-screen">
        <span className="matching-screen__spinner" aria-hidden="true" />
        <h1 className="matching-screen__title">Cancelling your session...</h1>
        <p className="matching-screen__sub">Waiting for your teammate to confirm.</p>
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

  async function handleReroll() {
    setRerollModalOpen(false);
    setRerolling(true);
    cancelOrder();
    const fresh = await placeOrder({
      gameSlug: order!.gameSlug,
      gameName: order!.gameName,
      option: order!.option,
      priceEUR: order!.priceEUR,
      teammates: order!.teammates,
      requestedTeammateId: null,
      customerLabel: order!.customerLabel,
    });
    if (fresh) router.push(`/checkout/matching?order=${fresh.id}`);
  }

  function handleConfirmCancel() {
    requestCancelSession();
    setCancelModalOpen(false);
  }


  // Rebooking skips the full checkout form (it's the same game/option/
  // price as the order you just finished), so credits are the payment
  // method here — a real deduction from the Postgres balance, same action
  // checkout's "pay with credits" option uses.
  async function handleKeepPlaying() {
    setStartingReplay(true);
    const result = await spendCredits(order!.priceEUR, `Replay · ${order!.gameName}`);
    if (!result.ok) {
      setStartingReplay(false);
      showToast(result.error ?? "Couldn't charge credits for this replay.", "error");
      return;
    }
    const replay = await placeReplayOrder(order!);
    if (replay) router.push(`/checkout/matching?order=${replay.id}`);
  }

  function handleHelpReason() {
    setHelpModalOpen(false);
    showToast("Your teammate initiated a refund for your game(s) and we've credited your account.", "success");
  }

  async function handleBuyMore() {
    setBuyingMore(true);
    const result = await spendCredits(order!.priceEUR * buyMoreQty, `${buyMoreQty}x replay · ${order!.gameName}`);
    if (!result.ok) {
      setBuyingMore(false);
      showToast(result.error ?? "Couldn't charge credits for this purchase.", "error");
      return;
    }
    const response = await fetch(`/api/dispatch/orders/${order!.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-games", quantity: buyMoreQty }),
    });
    if (!response.ok) {
      const data = await response.json();
      setBuyingMore(false);
      showToast(data.error ?? "Couldn't add more games.", "error");
      return;
    }
    setBuyingMore(false);
    setBuyMoreOpen(false);
    setBuyMoreQty(1);
    showToast(`Added ${buyMoreQty} more game${buyMoreQty > 1 ? "s" : ""} with ${teammate!.name}!`, "success");
  }

  function handlePoke() {
    showToast(`You poked ${teammate!.name}.`, "info");
  }

  function handleGG() {
    showToast(`Sent "GG" to ${teammate!.name}.`, "info");
  }

  function handleStartVoice() {
    showToast(`Voice invite sent to ${teammate!.name}.`, "info");
  }

  if (order.status === "completed") {
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

        <div className="session-complete__grid">
          <Reveal delay={60}>
            <div className="dashboard-panel session-complete__rate">
              <div className="session-complete__review-label">Review your teammate</div>
              <div className="session-complete__teammate-hero">
                <span className="session-complete__hero-avatar">
                  <AvatarIcon seed={teammate.id} />
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
                <span>Add a tip for {teammate.name}</span>
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

          <Reveal delay={100}>
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
              Would you like to continue playing with {teammate.name}? Charged from your credits balance.
            </p>
            <div className="session-complete__keep-playing-row">
              <button type="button" className="btn btn--vivid" onClick={handleKeepPlaying} disabled={startingReplay}>
                {startingReplay ? (
                  "Charging credits..."
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
            <p className="cancel-confirm__sub tip-confirm__note">Mock payment for this demo — no real charge.</p>
            <div className="cancel-confirm__actions">
              <button type="button" className="btn btn--ghost btn--block" onClick={() => setTipTarget(null)} disabled={sendingTip}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--vivid btn--block"
                disabled={sendingTip || (tipTarget === -1 && !(Number(tipCustom) > 0))}
                onClick={() => {
                  const amount = tipTarget === -1 ? Number(tipCustom) : tipTarget!;
                  if (!(amount > 0)) return;
                  setSendingTip(true);
                  setTimeout(() => {
                    addTip(teammate.id, order.id, amount);
                    setTipSent(amount);
                    setSendingTip(false);
                    setTipTarget(null);
                    showToast(`Tip of €${amount} sent to ${teammate.name}.`, "success");
                  }, 700);
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
        <Reveal delay={60}>
          <div className="dashboard-panel session-screen__teammate">
            <h1 className="session-screen__title">
              {order.isReplay ? `You're locked in with ${teammate.name} again` : "Your teammate is inviting you now"}
            </h1>

            <div className="session-screen__profile">
              <span className="session-screen__avatar">
                <AvatarIcon seed={teammate.id} />
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
                          <AvatarIcon seed={id} />
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

        <Reveal delay={100}>
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
            <div className="session-screen__voice-bar">
              <i className="fa-solid fa-headset" aria-hidden="true" />
              <span>
                <strong>Voice chat</strong> — talk instead of typing. {teammate.name} sees the moment you join.
              </span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={handleStartVoice}>
                Start voice
              </button>
            </div>
            <SessionChat
              conversationKey={conversationKey(teammate.id, order.customerLabel)}
              teammateName={teammate.name}
              customerName={order.customerLabel}
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
