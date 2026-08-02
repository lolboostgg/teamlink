"use client";

import { useEffect, useState } from "react";
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

// Splits the roster into one center slot (whoever accepts first — the
// priority pick, auto-confirmed if the customer doesn't act) plus up to two
// flanking slots on each side. Before anyone has accepted yet, the first
// candidate holds the center spot provisionally; the moment someone actually
// accepts, they take over the middle instead.
function arrangeCandidates(candidates: DispatchCandidate[], winner: DispatchCandidate | undefined) {
  if (candidates.length === 0) return { center: null as DispatchCandidate | null, left: [], right: [] };
  const center = winner ?? candidates[0];
  const rest = candidates.filter((c) => c !== center);
  const left: DispatchCandidate[] = [];
  const right: DispatchCandidate[] = [];
  rest.forEach((c, i) => (i % 2 === 0 ? left : right).push(c));
  return { center, left, right };
}

// Drives the customer-facing "Champion Select"-style live screen end to
// end — searching, up to 5 candidate alerts resolving in real time, then
// (once assigned) the live session/chat and eventual Session Complete view
// — all on this one page/URL, no route change, so the site header never
// disappears behind a different shell partway through an order.
export function MatchmakingScreen({ orderId }: Props) {
  const { order, dispatchSecondsLeft, selectionSecondsLeft, confirmSelection, cancelOrder } =
    useDispatchOrder(orderId);
  const [showSearching, setShowSearching] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSearching(false), 500);
    return () => clearTimeout(t);
  }, []);

  // showSearching is guaranteed true for the first 500ms of every mount —
  // including the client's very first paint, before useDispatchOrder's
  // effect has loaded the order from localStorage — so this branch (which
  // doesn't depend on `order` existing yet) has to come before the `!order`
  // check below, or a valid order would flash "not found" for a frame while
  // still loading.
  if (showSearching) {
    return (
      <div className="matching-screen">
        <span className="matching-screen__spinner" aria-hidden="true" />
        <h1 className="matching-screen__title">Finding your teammate...</h1>
        {order && (
          <p className="matching-screen__sub">
            Searching {order.candidates.length > 1 ? `up to ${order.candidates.length} teammates` : "your requested teammate"} for {order.gameName}
          </p>
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
  const selecting = order.status === "selecting";
  const { center, left, right } = arrangeCandidates(order.candidates, winner);

  return (
    <div className="matching-screen matching-screen--wide">
      <div className="matching-screen__head">
        <h1 className="matching-screen__title">
          {selecting ? "Pick your teammate" : "Dispatching your request..."}
        </h1>
        <p className="matching-screen__sub">
          {order.gameName} · {order.option} · <PriceTag amountEUR={order.priceEUR} />
        </p>
        {!selecting && (
          <p className="matching-screen__countdown">
            <i className="fa-regular fa-clock" aria-hidden="true" /> {dispatchSecondsLeft}s left to respond
          </p>
        )}
        {selecting && (
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
              isSelected={order.selectedTeammateId === c.teammateId}
              selectable={selecting}
              onSelect={() => confirmSelection(c.teammateId)}
            />
          ))}
        </div>

        {center && (
          <div className="candidate-stage__center">
            <CandidateSlot
              candidate={center}
              isFirstAccepted={winner?.teammateId === center.teammateId}
              isSelected={order.selectedTeammateId === center.teammateId}
              selectable={selecting}
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
              selectable={selecting}
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
