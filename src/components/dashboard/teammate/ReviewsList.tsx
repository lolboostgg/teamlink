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

export function ReviewsList({ reviews }: { reviews: DisplayReview[] }) {
  return <div className="teammate-reviews-grid">{reviews.map((review) =>
    <article className="teammate-review-card" key={review.id}>
      <div className="teammate-review-card__client"><span><SafeAvatarImage src={review.clientAvatarUrl} /></span><div>{review.clientProfileHref ? <Link href={review.clientProfileHref}>{review.client}</Link> : <strong>{review.client}</strong>}<small>Client review</small></div></div>
      <div className="teammate-review-card__order">{review.gameSlug && <GameMark slug={review.gameSlug} />}<div><strong>{review.gameName}</strong><small>{review.orderNo ? `Order #${review.orderNo}` : "Session"}{review.option ? ` · ${review.option}` : ""} · {review.date}</small></div></div>
      <span className="dashboard-list-item__stars" aria-label={`${review.rating} out of 5 stars`}>{"★".repeat(review.rating)}<em>{"★".repeat(5 - review.rating)}</em></span>
    </article>
  )}</div>;
}
