"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatchOrder } from "@/lib/matchmaking/useDispatchOrder";
import { firstAcceptedCandidate } from "@/lib/matchmaking/store";
import { getTeammateById } from "@/lib/teammates";
import { getBookingOptionDescription } from "@/lib/bookingOptions";
import { gameIcon } from "@/lib/gameArt";
import { playNotificationSound } from "@/lib/notificationSound";
import { CandidateSlot } from "@/components/matchmaking/CandidateSlot";
import { SessionScreen } from "@/components/matchmaking/SessionScreen";
import { PreferencesModal } from "@/components/matchmaking/PreferencesModal";
import { Modal } from "@/components/ui/Modal";
import { AvatarIcon } from "@/components/ui/AvatarIcon";
import { PriceTag } from "@/components/currency/PriceTag";
import type { DispatchCandidate } from "@/lib/matchmaking/types";

interface Props {
  orderId: string;
}

const VIBE_OPTIONS = [
  { value: "chill", label: "Chill", icon: "fa-solid fa-cloud" },
  { value: "tryhard", label: "Tryhard", icon: "fa-solid fa-fire" },
  { value: "social", label: "Social", icon: "fa-solid fa-comment-dots" },
  { value: "tilted", label: "Tilted", icon: "fa-solid fa-face-angry" },
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

// Center slot = whoever accepts first (the auto-confirmed priority pick if
// the customer doesn't act) with the rest split up to two per side. Only
// candidates who actually accepted are shown here at all — declined/timed
// out candidates never make it into the picker.
function arrangeCandidates(candidates: DispatchCandidate[], winner: DispatchCandidate | undefined) {
  const accepted = candidates.filter((c) => c.status === "accepted");
  const center = winner ?? accepted[0] ?? null;
  const rest = accepted.filter((c) => c !== center);
  const left: DispatchCandidate[] = [];
  const right: DispatchCandidate[] = [];
  rest.forEach((c, i) => (i % 2 === 0 ? left : right).push(c));
  return { center, left, right };
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
    confirmSelection,
    confirmMultiSelection,
    cancelOrder,
    updatePreferences,
  } = useDispatchOrder(orderId);

  const [prefsModalOpen, setPrefsModalOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [selectedAnimIds, setSelectedAnimIds] = useState<string[]>([]);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const pickSoundPlayed = useRef(false);
  const sessionSoundPlayed = useRef(false);

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

  // Covers both "still loading from localStorage" (loaded===false, which is
  // also exactly what the server rendered, so no hydration mismatch) and the
  // real "actively searching" phase once the order is in — same visual
  // either way, just with real details (and preferences) once available.
  if (!loaded || order?.status === "candidates_ready") {
    const optionDescription = order ? getBookingOptionDescription(order.option) : undefined;
    const dispatchWindowSeconds = Math.max(1, Math.ceil(dispatchWindowMs / 1000));
    const progressPct = order ? Math.min(100, (searchElapsedSeconds / dispatchWindowSeconds) * 100) : 0;
    return (
      <div className="matching-screen matching-screen--card matching-screen--arena">
        {order ? (
          <div className="match-ring" style={{ "--match-progress": `${progressPct}%` } as React.CSSProperties}>
            <span className="match-ring__time">{formatMMSS(searchElapsedSeconds)}</span>
          </div>
        ) : (
          <span className="matching-screen__spinner matching-screen__spinner--lg" aria-hidden="true" />
        )}
        <h1 className="matching-screen__title matching-screen__title--glow">Searching for your perfect teammate&hellip;</h1>
        {order && (
          <>
            <p className="matching-screen__elapsed-label">
              Estimated under {formatMMSS(dispatchWindowSeconds)}
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

            <div className="matching-screen__prefs-rows">
              <button type="button" className="matching-screen__prefs-row" onClick={() => setPrefsModalOpen(true)}>
                <span>
                  <i className="fa-solid fa-comments" aria-hidden="true" /> Conversation
                </span>
                <span>
                  {order.conversationPref ?? "Not set"} <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </span>
              </button>
              <button type="button" className="matching-screen__prefs-row" onClick={() => setPrefsModalOpen(true)}>
                <span>
                  <i className="fa-solid fa-gamepad" aria-hidden="true" /> Play style
                </span>
                <span>
                  {order.playStylePref ?? "Not set"} <i className="fa-solid fa-chevron-right" aria-hidden="true" />
                </span>
              </button>
            </div>

            <div className="matching-screen__vibe">
              <span className="matching-screen__vibe-label">What&rsquo;s your vibe?</span>
              <div className="matching-screen__vibe-options">
                {VIBE_OPTIONS.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    className={`matching-screen__vibe-btn${order.vibe === v.value ? " is-selected" : ""}`}
                    onClick={() => updatePreferences({ vibe: v.value })}
                  >
                    <i className={v.icon} aria-hidden="true" />
                    {v.label}
                  </button>
                ))}
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
              open={prefsModalOpen}
              onClose={() => setPrefsModalOpen(false)}
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

  if (order.status === "cancel_pending") {
    return (
      <div className="matching-screen">
        <span className="matching-screen__spinner" aria-hidden="true" />
        <h1 className="matching-screen__title">Cancelling your session...</h1>
        <p className="matching-screen__sub">Waiting for your teammate to confirm.</p>
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
                    <AvatarIcon seed={id} />
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
  const { center, left, right } = arrangeCandidates(order.candidates, winner);
  const confirmingTeammate = confirmingId ? getTeammateById(confirmingId) : null;
  const multiPick = order.teammates > 1;

  function handlePick(teammateId: string) {
    if (!multiPick) {
      setConfirmingId(teammateId);
      return;
    }
    setPickedIds((prev) => {
      if (prev.includes(teammateId)) return prev.filter((id) => id !== teammateId);
      if (prev.length >= order!.teammates) return prev;
      return [...prev, teammateId];
    });
  }

  function handleConfirmYes() {
    if (!confirmingId) return;
    confirmSelection(confirmingId);
    setSelectedAnimIds([confirmingId]);
    setConfirmingId(null);
  }

  function handleConfirmTeam() {
    if (pickedIds.length === 0) return;
    confirmMultiSelection(pickedIds);
    setSelectedAnimIds(pickedIds);
    setPickedIds([]);
  }

  function pickRankFor(teammateId: string): number | undefined {
    if (!multiPick) return undefined;
    const idx = pickedIds.indexOf(teammateId);
    return idx === -1 ? undefined : idx + 1;
  }

  function isPicked(teammateId: string): boolean {
    return multiPick ? pickedIds.includes(teammateId) : order!.selectedTeammateId === teammateId;
  }

  return (
    <div className="matching-screen matching-screen--wide matching-screen--arena">
      <div className="matching-screen__head">
        <h1 className="matching-screen__title matching-screen__title--glow">Pick your teammate</h1>
        <p className="matching-screen__sub">
          {order.gameName} · {order.option} · <PriceTag amountEUR={order.priceEUR} />
        </p>
        {multiPick ? (
          <p className="matching-screen__countdown">
            <i className="fa-regular fa-clock" aria-hidden="true" /> Pick up to {order.teammates} teammates —{" "}
            {selectionSecondsLeft}s left
          </p>
        ) : (
          <p className="matching-screen__countdown">
            <i className="fa-regular fa-clock" aria-hidden="true" /> Auto-confirming the first acceptor in{" "}
            {selectionSecondsLeft}s
          </p>
        )}
      </div>

      <div className="candidate-stage">
        <div className="candidate-stage__side candidate-stage__side--left">
          {left.map((c) => (
            <CandidateSlot
              key={c.teammateId}
              candidate={c}
              isFirstAccepted={false}
              isSelected={isPicked(c.teammateId)}
              pickRank={pickRankFor(c.teammateId)}
              selectable
              onSelect={() => handlePick(c.teammateId)}
            />
          ))}
        </div>

        {center && (
          <div className="candidate-stage__center">
            <CandidateSlot
              candidate={center}
              size="lg"
              isFirstAccepted={winner?.teammateId === center.teammateId}
              isSelected={isPicked(center.teammateId)}
              pickRank={pickRankFor(center.teammateId)}
              selectable
              onSelect={() => handlePick(center.teammateId)}
            />
          </div>
        )}

        <div className="candidate-stage__side candidate-stage__side--right">
          {right.map((c) => (
            <CandidateSlot
              key={c.teammateId}
              candidate={c}
              isFirstAccepted={false}
              isSelected={isPicked(c.teammateId)}
              pickRank={pickRankFor(c.teammateId)}
              selectable
              onSelect={() => handlePick(c.teammateId)}
            />
          ))}
        </div>
      </div>

      {multiPick && (
        <button
          type="button"
          className="btn btn--vivid matching-screen__confirm-team"
          onClick={handleConfirmTeam}
          disabled={pickedIds.length === 0}
        >
          Confirm team ({pickedIds.length}/{order.teammates})
        </button>
      )}

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

      <Modal open={!!confirmingId} onClose={() => setConfirmingId(null)} labelledBy="select-teammate-title">
        <div className="select-confirm">
          {confirmingId && (
            <span className="select-confirm__avatar">
              <AvatarIcon seed={confirmingId} />
            </span>
          )}
          <h2 id="select-teammate-title" className="select-confirm__title">
            Select teammate
          </h2>
          <p className="select-confirm__sub">
            You want to select <strong>{confirmingTeammate?.name ?? "this teammate"}</strong> to be your teammate?
          </p>
          <div className="select-confirm__actions">
            <button type="button" className="btn btn--ghost btn--block" onClick={() => setConfirmingId(null)}>
              No
            </button>
            <button type="button" className="btn btn--vivid btn--block" onClick={handleConfirmYes}>
              Yes
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
