import Link from "next/link";
import { GameMark } from "@/components/dashboard/GameMark";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";

export interface DisplayReview {
  id: string;
  client: string;
  gameName: string;
  rating: number;
  date: string;
  orderNo?: number;
  gameSlug?: string;
  option?: string;
  clientAvatarUrl?: string | null;
  clientProfileHref?: string | null;
}

/**
 * Five icons rather than repeated "★" characters. The text version leans on
 * whatever width the font gives that glyph, so the dimmed remainder never
 * lines up with the filled part and the row reads as ragged.
 */
function Stars({ rating }: { rating: number }) {
  return (
    <span className="review-stars" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((step) => (
        <i key={step} className={step <= rating ? "fa-solid fa-star" : "fa-regular fa-star"} aria-hidden="true" />
      ))}
    </span>
  );
}

export function ReviewsList({ reviews }: { reviews: DisplayReview[] }) {
  return (
    <div className="review-grid">
      {reviews.map((review) => (
        <article className="review-card" key={review.id}>
          <div className="review-card__head">
            <span className="review-card__avatar">
              <SafeAvatarImage src={review.clientAvatarUrl} />
            </span>
            <div className="review-card__who">
              {review.clientProfileHref ? (
                <Link href={review.clientProfileHref}>{review.client}</Link>
              ) : (
                <strong>{review.client}</strong>
              )}
              <small>{review.date}</small>
            </div>
            <Stars rating={review.rating} />
          </div>

          <div className="review-card__order">
            {review.gameSlug && <GameMark slug={review.gameSlug} size={24} />}
            <div>
              <strong>{review.gameName}</strong>
              <small>
                {review.orderNo ? `Order #${review.orderNo}` : "Session"}
                {review.option ? ` · ${review.option}` : ""}
              </small>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
