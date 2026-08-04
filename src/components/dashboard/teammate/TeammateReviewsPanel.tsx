"use client";

import { useEffect, useState } from "react";
import { listMyTeammateReviews, type TeammateReviewView } from "@/app/actions/reviews";
import { formatOrderDate } from "@/lib/dashboard/orderDisplay";
import { ReviewsList, type DisplayReview } from "@/components/dashboard/teammate/ReviewsList";

// The ratings customers actually left, read from the Review table. This used
// to come out of a localStorage store written on the *customer's* machine,
// which meant a teammate's own browser had nothing to show.
export function TeammateReviewsPanel() {
  const [reviews, setReviews] = useState<TeammateReviewView[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listMyTeammateReviews().then((rows) => {
      if (!cancelled) setReviews(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (reviews === null) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
        <p>Loading your reviews…</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="dashboard-empty">
        <i className="fa-solid fa-star-half-stroke" aria-hidden="true" />
        <p>No reviews yet.</p>
      </div>
    );
  }

  const display: DisplayReview[] = reviews.map((review) => ({
    id: review.id,
    client: review.client,
    gameName: review.gameName,
    rating: review.rating,
    date: formatOrderDate(review.createdAt),
  }));

  return <ReviewsList reviews={display} />;
}
