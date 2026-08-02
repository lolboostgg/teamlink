"use client";

import Link from "next/link";
import { useDispatchOrder } from "@/lib/matchmaking/useDispatchOrder";
import { firstAcceptedCandidate } from "@/lib/matchmaking/store";
import { CandidateSlot } from "@/components/matchmaking/CandidateSlot";
import { SessionScreen } from "@/components/matchmaking/SessionScreen";
import { PriceTag } from "@/components/currency/PriceTag";
import type { DispatchCandidate } from "@/lib/matchmaking/types";

interface Props {
  orderId: string;
}

function formatMMSS(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
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
// beat first (no candidate boxes at all, just how far along it is), then
// once someone has actually accepted, the "pick your teammate" reveal, then
// (once assigned) the live session/chat and eventual Session Complete view
// — all on this one page/URL, no route change, so the site header never
// disappears behind a different shell partway through an order.
export function MatchmakingScreen({ orderId }: Props) {
  const { order, loaded, selectionSecondsLeft, searchElapsedSeconds, dispatchWindowMs, confirmSelection, cancelOrder } =
    useDispatchOrder(orderId);

  // Covers both "still loading from localStorage" (loaded===false, which is
  // also exactly what the server rendered, so no hydration mismatch) and the
  // real "actively searching" phase once the order is in — same visual
  // either way, just with real details once available.
  if (!loaded || order?.status === "candidates_ready") {
    return (
      <div className="matching-screen">
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
            <button type="button" className="btn btn--ghost btn--sm matching-screen__cancel" onClick={cancelOrder}>
              Cancel request
            </button>
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

  if (order.status === "cancelled") {
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

  if (order.status === "assigned" || order.status === "in_progress" || order.status === "completed") {
    return <SessionScreen orderId={orderId} />;
  }

  const winner = firstAcceptedCandidate(order.candidates);
  const { center, left, right } = arrangeCandidates(order.candidates, winner);

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
              onSelect={() => confirmSelection(c.teammateId)}
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
              onSelect={() => confirmSelection(center.teammateId)}
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
              onSelect={() => confirmSelection(c.teammateId)}
            />
          ))}
        </div>
      </div>

      <button type="button" className="btn btn--ghost btn--sm matching-screen__cancel" onClick={cancelOrder}>
        Cancel request
      </button>
    </div>
  );
}
