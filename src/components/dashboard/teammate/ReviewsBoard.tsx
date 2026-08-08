"use client";

import { useMemo, useState } from "react";
import { ReviewsList, type DisplayReview } from "@/components/dashboard/teammate/ReviewsList";
import { GameMark } from "@/components/dashboard/GameMark";

type Sort = "newest" | "highest" | "lowest";

const SORTS: { key: Sort; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "highest", label: "Highest" },
  { key: "lowest", label: "Lowest" },
];

/**
 * The reviews page: what the score is made of, then the reviews themselves.
 *
 * A flat grid of cards answers "what did people say" and nothing else. The
 * number a teammate is actually judged on is the average, and the useful
 * questions about it — is the 4.9 held up by everyone, or by a hundred fives
 * covering three ones; is one game dragging it down — are questions about the
 * distribution. So the spread comes first and doubles as the filter.
 */
export function ReviewsBoard({ reviews }: { reviews: DisplayReview[] }) {
  const [rating, setRating] = useState<number | null>(null);
  const [game, setGame] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("newest");

  const average = useMemo(
    () => (reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0),
    [reviews],
  );

  // Five buckets, always all five — a rating nobody has given is the most
  // informative row on the chart and must not vanish for being empty.
  const spread = useMemo(() => {
    const counts = [5, 4, 3, 2, 1].map((score) => ({
      score,
      count: reviews.filter((r) => r.rating === score).length,
    }));
    const most = Math.max(1, ...counts.map((bucket) => bucket.count));
    return counts.map((bucket) => ({ ...bucket, share: (bucket.count / most) * 100 }));
  }, [reviews]);

  const games = useMemo(() => {
    const seen = new Map<string, { slug?: string; name: string; count: number }>();
    for (const review of reviews) {
      const entry = seen.get(review.gameName);
      if (entry) entry.count += 1;
      else seen.set(review.gameName, { slug: review.gameSlug, name: review.gameName, count: 1 });
    }
    return [...seen.values()].sort((a, b) => b.count - a.count);
  }, [reviews]);

  const visible = useMemo(() => {
    const filtered = reviews.filter(
      (review) => (rating === null || review.rating === rating) && (game === null || review.gameName === game),
    );
    if (sort === "newest") return filtered;
    return [...filtered].sort((a, b) => (sort === "highest" ? b.rating - a.rating : a.rating - b.rating));
  }, [reviews, rating, game, sort]);

  const filtered = rating !== null || game !== null;

  return (
    <>
      <div className="reviews-summary">
        <div className="reviews-summary__score">
          <strong>{average.toFixed(2)}</strong>
          <span className="review-stars" aria-label={`${average.toFixed(2)} out of 5`}>
            {[1, 2, 3, 4, 5].map((step) => (
              <i key={step} className={step <= Math.round(average) ? "fa-solid fa-star" : "fa-regular fa-star"} aria-hidden="true" />
            ))}
          </span>
          <small>
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
          </small>
        </div>

        <div className="reviews-spread">
          {spread.map((bucket) => (
            <button
              key={bucket.score}
              type="button"
              className={`reviews-spread__row${rating === bucket.score ? " is-active" : ""}`}
              aria-pressed={rating === bucket.score}
              disabled={bucket.count === 0}
              onClick={() => setRating(rating === bucket.score ? null : bucket.score)}
            >
              <span className="reviews-spread__label">
                {bucket.score} <i className="fa-solid fa-star" aria-hidden="true" />
              </span>
              <span className="reviews-spread__bar">
                <span style={{ width: `${bucket.share}%` }} />
              </span>
              <span className="reviews-spread__count">{bucket.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="reviews-toolbar">
        {games.length > 1 && (
          <div className="reviews-toolbar__games">
            <button
              type="button"
              className={`reviews-chip${game === null ? " is-active" : ""}`}
              onClick={() => setGame(null)}
            >
              All games
            </button>
            {games.map((entry) => (
              <button
                key={entry.name}
                type="button"
                className={`reviews-chip${game === entry.name ? " is-active" : ""}`}
                onClick={() => setGame(game === entry.name ? null : entry.name)}
              >
                {entry.slug && <GameMark slug={entry.slug} size={16} />}
                {entry.name}
                <em>{entry.count}</em>
              </button>
            ))}
          </div>
        )}

        <div className="orders-status-pills reviews-toolbar__sort">
          {SORTS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={`orders-status-pill${sort === option.key ? " is-active" : ""}`}
              aria-pressed={sort === option.key}
              onClick={() => setSort(option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length > 0 ? (
        <ReviewsList reviews={visible} />
      ) : (
        <div className="dashboard-empty dashboard-empty--compact">
          <i className="fa-solid fa-star-half-stroke" aria-hidden="true" />
          <p>No reviews match that.</p>
        </div>
      )}

      {filtered && (
        <button
          type="button"
          className="btn btn--ghost btn--sm reviews-reset"
          onClick={() => {
            setRating(null);
            setGame(null);
          }}
        >
          <i className="fa-solid fa-rotate-left" aria-hidden="true" /> Clear filters ({visible.length} of{" "}
          {reviews.length})
        </button>
      )}
    </>
  );
}
