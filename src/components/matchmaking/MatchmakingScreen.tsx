"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatchOrder } from "@/lib/matchmaking/useDispatchOrder";
import { firstAcceptedCandidate } from "@/lib/matchmaking/store";
import { getTeammateById } from "@/lib/teammates";
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
// the customer doesn't act) with the rest split up to two per side — this
// only ever runs once order.status is "selecting", so a winner is guaranteed
// to exist.
function arrangeCandidates(candidates: DispatchCandidate[], winner: DispatchCandidate | undefined) {
  const center = winner ?? candidates[0] ?? null;
  const rest = candidates.filter((c) => c !== center);
  const left: DispatchCandidate[] = [];
  const right: DispatchCandidate[] = [];
  rest.forEach((c, i) => (i % 2 === 0 ? left : right).push(c));
  return { center, left, right };
}

// Drives the customer-facing live screen end to end — a pure "searching"
// beat (with vibe/preferences you can set while it runs), then once someone
// has actually accepted, a "pick your teammate" reveal (click -> confirm ->
// a brief "Selected" beat), then (once assigned) the live session/chat and
// eventual Session Complete view — all on this one page/URL, no route
// change, so the site header never disappears behind a different shell.
export function MatchmakingScreen({ orderId }: Props) {
  const router = useRouter();
  const {
    order,
    loaded,
    selectionSecondsLeft,
    searchElapsedSeconds,
    dispatchWindowMs,
    confirmSelection,
    cancelOrder,
    updatePreferences,
  } = useDispatchOrder(orderId);

  const [prefsModalOpen, setPrefsModalOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [selectedAnimId, setSelectedAnimId] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);

  function handleConfirmCancelRequest() {
    cancelOrder();
    setCancelConfirmOpen(false);
  }

  // The "Selected!" beat is purely cosmetic — order.status already flipped
  // to "assigned" the moment confirmSelection() ran, so this just delays
  // handing off to SessionScreen for a moment.
  useEffect(() => {
    if (!selectedAnimId) return;
    const t = setTimeout(() => setSelectedAnimId(null), 1400);
    return () => clearTimeout(t);
  }, [selectedAnimId]);

  // A cancellation that went through requestCancelSession() (i.e. it has a
  // cancelApprovedAt) means a real teammate "approved" it — send the
  // customer back to the landing page automatically once that lands,
  // instead of leaving them on a dead order screen.
  useEffect(() => {
    if (order?.status !== "cancelled" || order.cancelApprovedAt === null) return;
    const t = setTimeout(() => router.push("/"), 1600);
    return () => clearTimeout(t);
  }, [order?.status, order?.cancelApprovedAt, router]);

  // Covers both "still loading from localStorage" (loaded===false, which is
  // also exactly what the server rendered, so no hydration mismatch) and the
  // real "actively searching" phase once the order is in — same visual
  // either way, just with real details (and preferences) once available.
  if (!loaded || order?.status === "candidates_ready") {
    return (
      <div className="matching-screen matching-screen--card">
        <span className="matching-screen__spinner matching-screen__spinner--lg" aria-hidden="true" />
        <h1 className="matching-screen__title">Searching for your perfect teammate...</h1>
        {order && (
          <>
            <p className="matching-screen__sub">
              {order.gameName} · {order.option} · <PriceTag amountEUR={order.priceEUR} />
            </p>
            <div className="matching-screen__elapsed">
              <span className="matching-screen__elapsed-time">{formatMMSS(searchElapsedSeconds)}</span>
              <span className="matching-screen__elapsed-label">
                Estimated under {formatMMSS(Math.ceil(dispatchWindowMs / 1000))}
              </span>
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
              className="btn btn--ghost btn--sm matching-screen__prefs-btn"
              onClick={() => setPrefsModalOpen(true)}
            >
              <i className="fa-solid fa-sliders" aria-hidden="true" /> Set preferences
              {(order.conversationPref || order.playStylePref) && (
                <span className="matching-screen__prefs-badge">
                  <i className="fa-solid fa-check" aria-hidden="true" />
                </span>
              )}
            </button>

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

  if (selectedAnimId) {
    const teammate = getTeammateById(selectedAnimId);
    return (
      <div className="matching-screen">
        <div className="selected-anim">
          <div className="selected-anim__card">
            <span className="selected-anim__badge" aria-hidden="true">
              <i className="fa-solid fa-check" />
            </span>
            <span className="selected-anim__avatar">
              <AvatarIcon seed={selectedAnimId} />
            </span>
            {teammate && (
              <>
                <div className="selected-anim__name">{teammate.name}</div>
                <div className="selected-anim__rating">
                  <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(1)} · {teammate.sessions} sessions
                </div>
              </>
            )}
          </div>
          <div className="selected-anim__label">You&rsquo;re locked in!</div>
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

  function handlePick(teammateId: string) {
    setConfirmingId(teammateId);
  }

  function handleConfirmYes() {
    if (!confirmingId) return;
    confirmSelection(confirmingId);
    setSelectedAnimId(confirmingId);
    setConfirmingId(null);
  }

  return (
    <div className="matching-screen matching-screen--wide">
      <div className="matching-screen__head">
        <h1 className="matching-screen__title">Pick your teammate</h1>
        <p className="matching-screen__sub">
          {order.gameName} · {order.option} · <PriceTag amountEUR={order.priceEUR} />
        </p>
        <p className="matching-screen__countdown">
          <i className="fa-regular fa-clock" aria-hidden="true" /> Auto-confirming the first acceptor in{" "}
          {selectionSecondsLeft}s
        </p>
      </div>

      <div className="candidate-stage">
        <div className="candidate-stage__side candidate-stage__side--left">
          {left.map((c) => (
            <CandidateSlot
              key={c.teammateId}
              candidate={c}
              isFirstAccepted={false}
              isSelected={order.selectedTeammateId === c.teammateId}
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
              isSelected={order.selectedTeammateId === center.teammateId}
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
              isSelected={order.selectedTeammateId === c.teammateId}
              selectable
              onSelect={() => handlePick(c.teammateId)}
            />
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
