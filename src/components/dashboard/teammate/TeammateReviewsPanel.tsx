"use client";

import { useAllOrders } from "@/lib/matchmaking/useAllOrders";
import { useReviews } from "@/lib/reviews";
import { useCurrentTeammateId } from "@/lib/matchmaking/useCurrentTeammateId";
import { formatOrderDate } from "@/lib/dashboard/orderDisplay";
import { ReviewsList, type DisplayReview } from "@/components/dashboard/teammate/ReviewsList";

// Real reviews (persisted the moment a client rates on Session Complete —
// see lib/reviews.ts) cross-referenced against the order history for
// client/game context, instead of a static mock list.
export function TeammateReviewsPanel() {
  const orders = useAllOrders();
  const teammateId = useCurrentTeammateId();
  const reviews = useReviews().filter((r) => r.teammateId === teammateId);

  const display: DisplayReview[] = reviews.map((r) => {
    const order = orders.find((o) => o.id === r.orderId);
    return {
      id: r.id,
      client: order?.customerLabel ?? "Anonymous",
      gameName: order?.gameName ?? "—",
      rating: r.rating,
      date: formatOrderDate(r.createdAt),
    };
  });

  if (display.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-star-half-stroke" aria-hidden="true" />
        <p>No reviews yet.</p>
      </div>
    );
  }

  return <ReviewsList reviews={display} />;
}
