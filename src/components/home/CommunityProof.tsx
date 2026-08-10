"use client";

import { useEffect, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import type { CommunityStats } from "@/lib/community";

export function CommunityProof() {
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/community")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => live && setStats(data))
      .catch(() => undefined);
    return () => { live = false; };
  }, []);

  if (!stats || stats.recentReviews.length === 0 || stats.averageRating === null) return null;

  const midpoint = Math.ceil(stats.recentReviews.length / 2);
  const firstRow = stats.recentReviews.slice(0, midpoint);
  const secondRow = stats.recentReviews.slice(midpoint);
  const rows = [firstRow, secondRow.length ? secondRow : firstRow];
  const score = stats.averageRating.toFixed(2).replace(/0$/, "");

  return (
    <section className="section section--tight community-proof" id="reviews">
      <div className="container">
        <Reveal>
          <div className="section__head section__head--center proof-heading">
            <div className="section__eyebrow">Verified player ratings</div>
            <h2 className="section__title">Reviews from real sessions.</h2>
            <p className="section__sub">{score}/5 from {stats.reviews} ratings left after completed QUP.gg sessions.</p>
          </div>
        </Reveal>

        <Reveal className="proof-carousel" delay={80}>
          {rows.map((reviews, rowIndex) => (
            <div className={`proof-carousel__viewport${rowIndex === 1 ? " is-reverse" : ""}`} key={rowIndex}>
              <div className="proof-carousel__track">
                {[0, 1].map((copy) => (
                  <div className="proof-carousel__set" key={copy} aria-hidden={copy === 1 || undefined}>
                    {reviews.map((review) => (
                      <article className="trust-review" key={`${copy}-${review.id}`}>
                        <div className="trust-review__top">
                          <div className="trust-review__stars" aria-label={`${review.rating} out of 5 stars`}>
                            {Array.from({ length: 5 }).map((_, index) => (
                              <span className={index < review.rating ? "is-filled" : ""} key={index}>
                                <i className="fa-solid fa-star" aria-hidden="true" />
                              </span>
                            ))}
                          </div>
                          <span className="trust-review__verified"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Verified</span>
                        </div>
                        <strong>{review.rating}/5 session rating</strong>
                        <p>{review.gameName} · {review.option}</p>
                        <footer>
                          <span className="trust-review__teammate">
                            <span className="trust-review__avatar">
                              <SafeAvatarImage src={review.teammateAvatarUrl} frame={review} alt="" />
                            </span>
                            <span><small>Teammate</small><b>{review.teammateName}</b></span>
                          </span>
                          <time>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(review.createdAt))}</time>
                        </footer>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
