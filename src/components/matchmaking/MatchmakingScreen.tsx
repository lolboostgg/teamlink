"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatchOrder } from "@/lib/matchmaking/useDispatchOrder";
import { confirmCheckoutReturn } from "@/app/actions/checkout";
import { firstAcceptedCandidate } from "@/lib/matchmaking/types";
import { getTeammateById } from "@/lib/teammates";
import { getBookingOptionDescription } from "@/lib/bookingOptions";
import { gameIcon } from "@/lib/gameArt";
import { playNotificationSound } from "@/lib/notificationSound";
import { SelectionCountdown } from "@/components/matchmaking/SelectionCountdown";
import { TeammateCard } from "@/components/matchmaking/TeammateCard";
import { SearchingCard } from "@/components/matchmaking/SearchingCard";
import { TeammateDetailsPanel } from "@/components/matchmaking/TeammateDetailsPanel";
import { SessionScreen } from "@/components/matchmaking/SessionScreen";
import { PreferencesModal } from "@/components/matchmaking/PreferencesModal";
import { CancelPendingCard } from "@/components/matchmaking/CancelPendingCard";
import { Modal } from "@/components/ui/Modal";
import { AvatarIcon } from "@/components/ui/AvatarIcon";
import { avatarFrameStyle } from "@/lib/avatarFrame";
import { PriceTag } from "@/components/currency/PriceTag";
import type { DispatchCandidate } from "@/lib/matchmaking/types";

type SlotPosition = "farLeft" | "nearLeft" | "center" | "nearRight" | "farRight";
interface Slot {
  position: SlotPosition;
  candidate: DispatchCandidate | null;
}

type PickAction = "select" | "add" | "remove";

// Exactly 5 fixed visual slots, filled center-out: the winner (first
// accepted, or the customer's own pick order otherwise) takes the middle,
// then alternates near/far left and right. Anything that isn't an accepted
// candidate — pending, declined, timed out, or simply not dispatched to —
// renders as a "searching" placeholder rather than an empty gap or a
// visibly-declined card.
function buildSlots(candidates: DispatchCandidate[], winner: DispatchCandidate | undefined): Slot[] {
  const accepted = [...candidates]
    .filter((c) => c.status === "accepted")
    .sort((a, b) => (a.respondedAt ?? 0) - (b.respondedAt ?? 0));
  const ordered = winner ? [winner, ...accepted.filter((c) => c.teammateId !== winner.teammateId)] : accepted;
  const [center, s2, s3, s4, s5] = ordered;
  return [
    { position: "farLeft", candidate: s4 ?? null },
    { position: "nearLeft", candidate: s2 ?? null },
    { position: "center", candidate: center ?? null },
    { position: "nearRight", candidate: s3 ?? null },
    { position: "farRight", candidate: s5 ?? null },
  ];
}

interface Props {
  orderId: string;
}

const VIBE_OPTIONS = [
  { value: "chill", label: "Chill", icon: "fa-solid fa-cloud", color: "var(--hue-cyan)" },
  { value: "tryhard", label: "Tryhard", icon: "fa-solid fa-fire", color: "var(--hue-gold)" },
  { value: "social", label: "Social", icon: "fa-solid fa-comment-dots", color: "var(--hue-purple)" },
  { value: "tilted", label: "Tilted", icon: "fa-solid fa-face-angry", color: "var(--danger)" },
];

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Shared by both the searching and picking phases — same destructive
// action (give up the request, no charge carried through), same dialog.
function CancelRequestModal({ open, onClose, onConfirm }: { open: boolean; onClose: () => void; onConfirm: () => void }) {
  return (
    <Modal open={open} onClose={onClose} labelledBy="cancel-request-title">
      <div className="cancel-confirm">
        <span className="modal-icon modal-icon--warning" aria-hidden="true">
          <i className="fa-solid fa-triangle-exclamation" />
        </span>
        <h2 id="cancel-request-title" className="cancel-confirm__title">
          Cancel this request?
        </h2>
        <p className="cancel-confirm__sub">
          We&rsquo;ll stop searching for a teammate. No charge was carried through beyond this mock checkout.
        </p>
        <div className="cancel-confirm__actions">
          <button type="button" className="btn btn--ghost btn--block" onClick={onClose}>
            Keep searching
          </button>
          <button type="button" className="btn btn--danger btn--block" onClick={onConfirm}>
            Cancel request
          </button>
        </div>
      </div>
    </Modal>
  );
}

// Drives the customer-facing live screen end to end — a pure "searching"
// beat (with vibe/preferences you can set while it runs), then once
// candidates have actually answered, a "pick your teammate" reveal (single
// pick asks for confirmation; picking more than one teammate lets you
// build up the whole team before confirming), then (once assigned) the
// live session/chat and eventual Session Complete view — all on this one
// page/URL, no route change, so the site header never disappears behind a
// different shell.
export function MatchmakingScreen({ orderId }: Props) {
  const router = useRouter();
  const {
    order,
    loaded,
    selectionSecondsLeft,
    searchElapsedSeconds,
    dispatchWindowMs,
    selectionWindowMs,
    confirmSelection,
    confirmMultiSelection,
    cancelOrder,
    updatePreferences,
  } = useDispatchOrder(orderId);

  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [confirmTarget, setConfirmTarget] = useState<{ teammateId: string; action: PickAction } | null>(null);
  const [selectedAnimIds, setSelectedAnimIds] = useState<string[]>([]);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const pickSoundPlayed = useRef(false);
  const sessionSoundPlayed = useRef(false);
  const settledCheckout = useRef(false);

  // Coming back from Stripe's hosted page. Rather than waiting for the
  // webhook to make its way to us, the return settles the payment itself —
  // the session id here is just a pointer, its status is read back from
  // Stripe server-side. Once per mount, hence the ref.
  useEffect(() => {
    const sessionId = new URLSearchParams(window.location.search).get("checkout");
    if (!sessionId || !sessionId.startsWith("cs_") || settledCheckout.current) return;
    settledCheckout.current = true;
    void confirmCheckoutReturn(sessionId);
  }, []);

  function handleConfirmCancelRequest() {
    cancelOrder();
    setCancelConfirmOpen(false);
  }

  // The "Selected!" beat is purely cosmetic — order.status already flipped
  // to "assigned" the moment the pick was confirmed, so this just delays
  // handing off to SessionScreen for a moment.
  useEffect(() => {
    if (selectedAnimIds.length === 0) return;
    const t = setTimeout(() => setSelectedAnimIds([]), 1400);
    return () => clearTimeout(t);
  }, [selectedAnimIds]);

  // A cancellation that went through requestCancelSession() (i.e. it has a
  // cancelApprovedAt) means a real teammate "approved" it — send the
  // customer back to the landing page automatically once that lands,
  // instead of leaving them on a dead order screen.
  useEffect(() => {
    if (order?.status !== "cancelled" || order.cancelApprovedAt === null) return;
    const t = setTimeout(() => router.push("/"), 1600);
    return () => clearTimeout(t);
  }, [order?.status, order?.cancelApprovedAt, router]);

  // A short chime at the two moments that actually need the customer's
  // attention if they've tabbed away: candidates are ready to pick from,
  // and the session has actually started. Each only ever fires once per
  // order thanks to the refs.
  useEffect(() => {
    if (order?.status === "selecting" && !pickSoundPlayed.current) {
      pickSoundPlayed.current = true;
      playNotificationSound();
    }
  }, [order?.status]);

  useEffect(() => {
    if ((order?.status === "assigned" || order?.status === "in_progress") && !sessionSoundPlayed.current) {
      sessionSoundPlayed.current = true;
      playNotificationSound();
    }
  }, [order?.status]);

  // Nothing is known yet, so claim nothing. This used to fall into the
  // searching card below, which announced "searching for your perfect
  // teammate" on every reload — including reloads of a session that was
  // assigned an hour ago and only needed fetching.
  if (!loaded) {
    return (
      <div className="matching-screen matching-screen--card matching-screen--arena">
        <span className="matching-screen__spinner matching-screen__spinner--lg" aria-hidden="true" />
      </div>
    );
  }

  if (order?.status === "candidates_ready") {
    const optionDescription = order ? getBookingOptionDescription(order.gameSlug, order.option) : undefined;
    const dispatchWindowSeconds = Math.max(1, Math.ceil(dispatchWindowMs / 1000));
    const progressPct = order ? Math.min(100, (searchElapsedSeconds / dispatchWindowSeconds) * 100) : 0;
    return (
      <div className="matching-screen matching-screen--card matching-screen--arena matching-screen--searching">
        {order ? (
          <div className="match-ring" style={{ "--match-progress": `${progressPct}%` } as React.CSSProperties}>
            <span className="match-ring__time">{formatMMSS(searchElapsedSeconds)}</span>
          </div>
        ) : (
          <span className="matching-screen__spinner matching-screen__spinner--lg" aria-hidden="true" />
        )}
        <h1 className="matching-screen__title matching-screen__title--glow">
          {order?.isReplay ? "Waiting for your teammate…" : "Searching for your perfect teammate…"}
        </h1>
        {order && (
          <>
            {/* No deadline to count down to any more: the dispatcher keeps
                sending waves until somebody accepts, so promising a time we
                don't control would be a countdown to nothing. */}
            <p className="matching-screen__elapsed-label">
              {order.isReplay
                ? "Exclusive request · waiting on your teammate"
                : "Usually under a minute — we'll keep looking until someone takes it."}
            </p>

            <div className="matching-screen__summary">
              <div className="matching-screen__summary-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gameIcon(order.gameSlug)} alt="" className="matching-screen__summary-icon" />
                <span className="matching-screen__summary-title">{order.gameName}</span>
                <PriceTag amountEUR={order.priceEUR} />
              </div>
              <div className="matching-screen__summary-row">
                <span className="matching-screen__summary-icon matching-screen__summary-icon--fallback" aria-hidden="true">
                  <i className="fa-solid fa-user-group" />
                </span>
                <span className="matching-screen__summary-body">
                  <span className="matching-screen__summary-title">{order.option}</span>
                  {optionDescription && <span className="matching-screen__summary-desc">{optionDescription}</span>}
                </span>
                <span className="matching-screen__summary-count">{order.teammates}x game</span>
              </div>
            </div>

            {/* Set right here rather than behind a modal: while the search
                runs there is nothing else to do, and every one of these was
                two taps and a Confirm away for a single-word choice. */}
            <div className="matching-screen__prefs">
              {/* Conversation and play style are four and five long labels;
                  inline they either wrapped into four lines each or ran off
                  the side of the card. As a summary row they take one line
                  and the choosing happens in the modal that already exists
                  for them. Vibe stays out here: four icons is compact
                  already, and it is the one people actually change. */}
              <button
                type="button"
                className="matching-screen__pref-summary"
                onClick={() => setPrefsOpen(true)}
              >
                <span className="matching-screen__pref-summary-main">
                  <span className="matching-screen__pref-summary-label">
                    <i className="fa-solid fa-sliders" aria-hidden="true" /> Conversation &amp; play style
                  </span>
                  <span className="matching-screen__pref-summary-value">
                    {order.conversationPref ?? "No preference"} · {order.playStylePref ?? "No preference"}
                  </span>
                </span>
                <span className="matching-screen__pref-summary-action">Change</span>
              </button>

              <div className="matching-screen__pref-group">
                <span className="matching-screen__pref-label">
                  <i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true" /> Vibe
                </span>
                <div className="matching-screen__vibe-options">
                  {VIBE_OPTIONS.map((v) => (
                    <button
                      key={v.value}
                      type="button"
                      className={`matching-screen__vibe-btn${order.vibe === v.value ? " is-selected" : ""}`}
                      style={{ "--vibe-color": v.color } as CSSProperties}
                      onClick={() => updatePreferences({ vibe: v.value })}
                    >
                      <span className="matching-screen__vibe-icon">
                        <i className={v.icon} aria-hidden="true" />
                      </span>
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn--ghost btn--sm matching-screen__cancel"
              onClick={() => setCancelConfirmOpen(true)}
            >
              Cancel request
            </button>

            <PreferencesModal
              open={prefsOpen}
              onClose={() => setPrefsOpen(false)}
              conversationPref={order.conversationPref}
              playStylePref={order.playStylePref}
              onSave={updatePreferences}
            />

            <CancelRequestModal
              open={cancelConfirmOpen}
              onClose={() => setCancelConfirmOpen(false)}
              onConfirm={handleConfirmCancelRequest}
            />
          </>
        )}
      </div>
    );
  }

  if (!order) {
    return (
      <div className="matching-screen">
        <p className="matching-screen__lost">
          We couldn&rsquo;t find that order. <Link href="/games">Back to games</Link>
        </p>
      </div>
    );
  }

  // Back from the hosted checkout, before Stripe's webhook has landed — or
  // after cancelling on that page, in which case the webhook eventually
  // cancels this order and the branch below takes over.
  if (order.status === "awaiting_payment") {
    return (
      <div className="matching-screen">
        <span className="matching-screen__spinner" aria-hidden="true" />
        <h1 className="matching-screen__title">Confirming your payment...</h1>
        <p className="matching-screen__sub">
          We start looking for a teammate the moment it clears. You can leave this page open.
        </p>
      </div>
    );
  }

  if (order.status === "cancel_pending") {
    return (
      <div className="matching-screen">
        <CancelPendingCard refundEUR={order.priceEUR} />
      </div>
    );
  }

  if (order.status === "cancelled") {
    if (order.cancelApprovedAt !== null) {
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
    return (
      <div className="matching-screen">
        <h1 className="matching-screen__title">Request cancelled</h1>
        <p className="matching-screen__sub">No charge was carried through beyond this mock checkout.</p>
        <Link href="/games" className="btn btn--vivid">
          Back to games
        </Link>
      </div>
    );
  }

  if (order.status === "no_match") {
    return (
      <div className="matching-screen">
        <span className="matching-screen__spinner matching-screen__spinner--stopped" aria-hidden="true">
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </span>
        <h1 className="matching-screen__title">No one was available</h1>
        <p className="matching-screen__sub">Every teammate we tried was busy or didn&rsquo;t respond in time.</p>
        <Link href={`/games/${order.gameSlug}`} className="btn btn--vivid">
          Find another teammate
        </Link>
      </div>
    );
  }

  if (selectedAnimIds.length > 0) {
    return (
      <div className="matching-screen">
        <div className="selected-anim">
          <div className="selected-anim__row">
            {selectedAnimIds.map((id) => {
              const teammate = getTeammateById(id);
              return (
                <div className="selected-anim__card" key={id}>
                  <span className="selected-anim__badge" aria-hidden="true">
                    <i className="fa-solid fa-check" />
                  </span>
                  <span className="selected-anim__avatar">
                    <AvatarIcon seed={id} avatarUrl={teammate?.avatarUrl} frame={teammate ?? undefined} />
                  </span>
                  {teammate && (
                    <>
                      <div className="selected-anim__name">{teammate.name}</div>
                      <div className="selected-anim__rating">
                        <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(1)}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="selected-anim__label">
            {selectedAnimIds.length > 1 ? "You're locked in with your team!" : "You're locked in!"}
          </div>
        </div>
      </div>
    );
  }

  if (order.status === "assigned" || order.status === "in_progress" || order.status === "completed") {
    return <SessionScreen orderId={orderId} />;
  }

  const winner = firstAcceptedCandidate(order.candidates);
  const slots = buildSlots(order.candidates, winner);
  const multiPick = order.teammates > 1;
  const maxPicks = multiPick ? order.teammates : 1;

  // Clicking a card never selects it directly — it opens a confirm modal
  // (select / add-to-team / remove-from-team depending on mode and current
  // state), and only actually confirming there changes anything.
  function handleCardClick(teammateId: string) {
    if (!multiPick) {
      setConfirmTarget({ teammateId, action: "select" });
      return;
    }
    if (pickedIds.includes(teammateId)) {
      setConfirmTarget({ teammateId, action: "remove" });
    } else if (pickedIds.length < maxPicks) {
      setConfirmTarget({ teammateId, action: "add" });
    }
  }

  function handleModalConfirm() {
    if (!confirmTarget) return;
    const { teammateId, action } = confirmTarget;
    if (action === "select") {
      confirmSelection(teammateId);
      setSelectedAnimIds([teammateId]);
    } else if (action === "add") {
      const next = [...pickedIds, teammateId];
      if (next.length >= maxPicks) {
        confirmMultiSelection(next);
        setSelectedAnimIds(next);
        setPickedIds([]);
      } else {
        setPickedIds(next);
      }
    } else if (action === "remove") {
      setPickedIds((prev) => prev.filter((id) => id !== teammateId));
    }
    setConfirmTarget(null);
  }

  function pickRankFor(teammateId: string): number | undefined {
    if (!multiPick) return undefined;
    const idx = pickedIds.indexOf(teammateId);
    return idx === -1 ? undefined : idx + 1;
  }

  const selectionWindowSeconds = Math.max(1, Math.ceil(selectionWindowMs / 1000));
  const selectionElapsed = selectionWindowSeconds - selectionSecondsLeft;
  const selectionProgressPct = Math.min(100, Math.max(0, (selectionElapsed / selectionWindowSeconds) * 100));
  const countdownCaption = multiPick
    ? `${pickedIds.length}/${maxPicks} selected — auto-selecting in ${selectionSecondsLeft}s`
    : `Auto-selecting in ${selectionSecondsLeft}s`;
  const confirmTeammate = confirmTarget ? getTeammateById(confirmTarget.teammateId) : null;
  const confirmCopy: Record<PickAction, string> = {
    select: `Are you sure you want to select ${confirmTeammate?.name ?? "this teammate"} as your teammate?`,
    add: `Add ${confirmTeammate?.name ?? "this teammate"} to your team? (${pickedIds.length + 1}/${maxPicks})`,
    remove: `Remove ${confirmTeammate?.name ?? "this teammate"} from your team?`,
  };

  return (
    <div className="matching-screen matching-screen--full matching-screen--arena">
      <div className="matching-screen__head">
        <h1 className="matching-screen__title matching-screen__title--glow">Select your teammate</h1>
        <p className="matching-screen__sub">These teammates want to play with you</p>
        <SelectionCountdown
          secondsLeft={selectionSecondsLeft}
          progressPct={selectionProgressPct}
          caption={countdownCaption}
        />
      </div>

      <div className="teammate-row" role="list" aria-label="Candidate teammates">
        {slots.map((slot) => {
          const teammate = slot.candidate ? getTeammateById(slot.candidate.teammateId) : undefined;
          const isCenter = slot.position === "center";
          return (
            <div
              key={slot.position}
              className={`teammate-row__col${isCenter ? " teammate-row__col--center" : ""}`}
              role="listitem"
            >
              {slot.candidate && teammate ? (
                <TeammateCard
                  teammate={teammate}
                  gameSlug={order.gameSlug}
                  isCenter={isCenter}
                  isFirstAccepted={winner?.teammateId === slot.candidate.teammateId}
                  isSelected={pickedIds.includes(slot.candidate.teammateId)}
                  pickRank={pickRankFor(slot.candidate.teammateId)}
                  onSelect={() => handleCardClick(slot.candidate!.teammateId)}
                />
              ) : (
                <SearchingCard isCenter={isCenter} />
              )}
              <TeammateDetailsPanel teammate={teammate ?? null} />
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="btn btn--ghost btn--sm matching-screen__cancel"
        onClick={() => setCancelConfirmOpen(true)}
      >
        Cancel request
      </button>

      <CancelRequestModal
        open={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={handleConfirmCancelRequest}
      />

      <Modal open={!!confirmTarget} onClose={() => setConfirmTarget(null)} labelledBy="pick-confirm-title">
        <div className="pick-confirm">
          <span className="pick-confirm__avatar">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={confirmTeammate?.avatarUrl || "/avatars/default.webp"}
              alt=""
              style={confirmTeammate ? avatarFrameStyle(confirmTeammate) : undefined}
            />
          </span>
          <h2 id="pick-confirm-title" className="pick-confirm__title">
            {confirmTarget?.action === "remove" ? "Remove teammate" : "Select teammate"}
          </h2>
          <p className="pick-confirm__sub">{confirmTarget && confirmCopy[confirmTarget.action]}</p>
          <div className="pick-confirm__actions">
            <button type="button" className="btn btn--ghost btn--block" onClick={() => setConfirmTarget(null)}>
              No
            </button>
            <button
              type="button"
              className={`btn btn--block ${confirmTarget?.action === "remove" ? "btn--danger" : "btn--vivid"}`}
              onClick={handleModalConfirm}
            >
              Yes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
