"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDispatchOrder } from "@/lib/matchmaking/useDispatchOrder";
import { firstAcceptedCandidate } from "@/lib/matchmaking/store";
import { CandidateSlot } from "@/components/matchmaking/CandidateSlot";
import { PriceTag } from "@/components/currency/PriceTag";

interface Props {
  orderId: string;
}

// Drives the customer-facing "Champion Select"-style live screen: a brief
// local searching beat, then up to 5 candidate slots (or a single one for a
// specific-teammate request) resolving in real time via useDispatchOrder.
export function MatchmakingScreen({ orderId }: Props) {
  const router = useRouter();
  const { order, dispatchSecondsLeft, selectionSecondsLeft, confirmSelection, cancelOrder } =
    useDispatchOrder(orderId);
  const [showSearching, setShowSearching] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowSearching(false), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!order) {
    return (
      <div className="matching-screen">
        <p className="matching-screen__lost">
          We couldn&rsquo;t find that order. <Link href="/games">Back to games</Link>
        </p>
      </div>
    );
  }

  if (showSearching) {
    return (
      <div className="matching-screen">
        <span className="matching-screen__spinner" aria-hidden="true" />
        <h1 className="matching-screen__title">Finding your teammate...</h1>
        <p className="matching-screen__sub">
          Searching {order.candidates.length > 1 ? `up to ${order.candidates.length} teammates` : "your requested teammate"} for {order.gameName}
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
    const teammateId = order.selectedTeammateId;
    return (
      <div className="matching-screen">
        <span className="matching-screen__spinner matching-screen__spinner--done" aria-hidden="true">
          <i className="fa-solid fa-check" aria-hidden="true" />
        </span>
        <h1 className="matching-screen__title">You&rsquo;re matched!</h1>
        <p className="matching-screen__sub">Your teammate is ready for {order.gameName} — {order.option}.</p>
        <button
          type="button"
          className="btn btn--vivid"
          onClick={() => router.push(`/checkout/success?teammate=${teammateId ?? ""}`)}
        >
          Continue
        </button>
      </div>
    );
  }

  const winner = firstAcceptedCandidate(order.candidates);
  const selecting = order.status === "selecting";

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

      <div className="candidate-grid">
        {order.candidates.map((c) => (
          <CandidateSlot
            key={c.teammateId}
            candidate={c}
            isFirstAccepted={winner?.teammateId === c.teammateId}
            isSelected={order.selectedTeammateId === c.teammateId}
            selectable={selecting}
            onSelect={() => confirmSelection(c.teammateId)}
          />
        ))}
      </div>

      <button type="button" className="btn btn--ghost btn--sm matching-screen__cancel" onClick={cancelOrder}>
        Cancel request
      </button>
    </div>
  );
}
