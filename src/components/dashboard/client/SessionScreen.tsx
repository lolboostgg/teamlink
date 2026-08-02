"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatchOrder } from "@/lib/matchmaking/useDispatchOrder";
import { createOrder, createReplayOrder } from "@/lib/matchmaking/store";
import { getTeammateById } from "@/lib/teammates";
import { getLanguageMeta } from "@/lib/i18n";
import { getRankMeta } from "@/lib/lolAssets";
import { FlagIcon } from "@/components/ui/FlagIcon";
import { AvatarIcon } from "@/components/ui/AvatarIcon";
import { PriceTag } from "@/components/currency/PriceTag";
import { Reveal } from "@/components/ui/Reveal";
import { SessionChat } from "@/components/dashboard/client/SessionChat";

interface Props {
  orderId: string;
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function discountCodeFor(orderId: string): string {
  const clean = orderId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `TL10-${clean.slice(-6)}`;
}

// The post-checkout "live session" screen, reached once a teammate has been
// assigned (see MatchmakingScreen's "Continue" button). One component drives
// two very different phases off the same order: the invite/chat view while
// assigned/in_progress, and the rate + discount + keep-playing view once
// completed — same pattern as MatchmakingScreen switching on order.status.
export function SessionScreen({ orderId }: Props) {
  const router = useRouter();
  const { order, sessionElapsedSeconds, cancelOrder } = useDispatchOrder(orderId);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [tip, setTip] = useState<number | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rerolling, setRerolling] = useState(false);
  const [startingReplay, setStartingReplay] = useState(false);

  if (!order) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-panel__title">Session not found</div>
        <p className="dashboard-panel__sub">
          <Link href="/dashboard/client/orders">Back to your orders</Link>
        </p>
      </div>
    );
  }

  const teammate = order.selectedTeammateId ? getTeammateById(order.selectedTeammateId) : null;
  const liveStatuses: string[] = ["assigned", "in_progress", "completed"];

  if (!teammate || !liveStatuses.includes(order.status)) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-panel__title">This session isn&rsquo;t ready yet</div>
        <p className="dashboard-panel__sub">
          <Link href={`/checkout/matching?order=${order.id}`}>Go back to matching</Link>
        </p>
      </div>
    );
  }

  function handleReroll() {
    setRerolling(true);
    cancelOrder();
    const fresh = createOrder({
      gameSlug: order!.gameSlug,
      gameName: order!.gameName,
      option: order!.option,
      priceEUR: order!.priceEUR,
      requestedTeammateId: null,
      customerLabel: order!.customerLabel,
    });
    if (fresh) router.push(`/checkout/matching?order=${fresh.id}`);
  }

  function handleAskCancel() {
    cancelOrder();
    router.push("/dashboard/client/orders");
  }

  function handleCopyCode() {
    navigator.clipboard?.writeText(discountCodeFor(order!.id));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  function handleKeepPlaying() {
    setStartingReplay(true);
    const replay = createReplayOrder(order!);
    if (replay) router.push(`/dashboard/client/session/${replay.id}`);
  }

  if (order.status === "completed") {
    const code = discountCodeFor(order.id);
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
              <div className="dashboard-panel__title">Rate your teammate</div>
              <p className="dashboard-panel__sub">All ratings are anonymous and don&rsquo;t show up on their profile.</p>

              <div className="session-complete__teammate-row">
                <span className="chat-list__avatar">
                  <AvatarIcon seed={teammate.id} />
                </span>
                <div className="session-complete__teammate-meta">
                  <div className="session-complete__teammate-name">{teammate.name}</div>
                  <div className="session-complete__teammate-rating">
                    <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(1)} ({teammate.sessions})
                  </div>
                </div>
                <div className="session-complete__stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                      className="session-complete__star"
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(n)}
                    >
                      <i
                        className={(hoverRating || rating) >= n ? "fa-solid fa-star" : "fa-regular fa-star"}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                </div>
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
                  onClick={() => setFavorited((v) => !v)}
                >
                  <i className={favorited ? "fa-solid fa-heart" : "fa-regular fa-heart"} aria-hidden="true" />{" "}
                  {favorited ? "Favorited" : "Mark as favorite"}
                </button>
              </div>

              <div className="session-complete__tip">
                <span>Add a tip for {teammate.name}</span>
                <div className="session-complete__tip-options">
                  {[1, 2, 3].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className={`session-complete__tip-btn${tip === amount ? " is-active" : ""}`}
                      onClick={() => setTip(amount)}
                    >
                      {amount}€
                    </button>
                  ))}
                  <button type="button" className="session-complete__tip-btn" onClick={() => setTip(null)}>
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={100}>
            <div className="dashboard-panel session-complete__discount">
              <span className="session-complete__discount-icon">
                <i className="fa-solid fa-ticket" aria-hidden="true" />
              </span>
              <div className="session-complete__discount-title">Your next session is 10% off</div>
              <p className="session-complete__discount-sub">A one-time code, just for you.</p>
              <div className="session-complete__discount-code">
                <code>{code}</code>
                <button type="button" className="btn btn--ghost btn--sm" onClick={handleCopyCode}>
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <p className="session-complete__discount-note">Valid for one purchase only. Not cumulative.</p>
            </div>
          </Reveal>
        </div>

        <Reveal delay={140}>
          <div className="dashboard-panel session-complete__keep-playing">
            <div className="dashboard-panel__title">Keep playing</div>
            <p className="dashboard-panel__sub">Would you like to continue playing with {teammate.name}?</p>
            <div className="session-complete__keep-playing-row">
              <button type="button" className="btn btn--vivid" onClick={handleKeepPlaying} disabled={startingReplay}>
                {startingReplay ? "Sending request..." : `Play again with ${teammate.name}`}
              </button>
              <Link href="/dashboard/client" className="btn btn--ghost">
                Not now
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    );
  }

  const inSession = order.status === "in_progress";
  const rank = teammate.lolRank ? getRankMeta(teammate.lolRank) : null;

  return (
    <div className="session-screen">
      <Reveal>
        <div className={`session-screen__status${inSession ? " is-live" : ""}`}>
          {inSession ? (
            <>
              <span className="pulse-dot" aria-hidden="true" /> In session · {formatClock(sessionElapsedSeconds)}
            </>
          ) : (
            <>
              <i className="fa-solid fa-circle-notch fa-spin" aria-hidden="true" /> Connecting you now...
            </>
          )}
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

            <div className="session-screen__buttons">
              <button type="button" className="btn btn--ghost btn--block" onClick={handleReroll} disabled={rerolling}>
                <i className="fa-solid fa-shuffle" aria-hidden="true" /> {rerolling ? "Rerolling..." : "Reroll new teammate"}
              </button>
              <button type="button" className="session-screen__cancel-link" onClick={handleAskCancel}>
                Ask to cancel session
              </button>
            </div>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div className="dashboard-panel session-screen__chat-panel">
            <SessionChat teammateName={teammate.name} />
          </div>
        </Reveal>
      </div>
    </div>
  );
}
