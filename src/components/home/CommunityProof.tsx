"use client";

import { useEffect, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import type { CommunityStats } from "@/lib/community";
import { useLanguage } from "@/components/language/LanguageProvider";

const reviewTitles = [
  "Smooth session",
  "Great teammate",
  "Quick and easy",
  "Would play again",
  "Friendly and focused",
  "Exactly as expected",
  "Great teamplay",
  "Fast matchmaking",
  "Good communication",
  "Fun from the start",
  "Calm and reliable",
  "A really good game",
  "Easy win together",
  "Strong coordination",
  "Ready right away",
  "Good vibes all game",
  "Helpful teammate",
  "Clean and simple",
  "Perfect duo session",
  "Solid match",
] as const;

function spreadTeammates(reviews: CommunityStats["recentReviews"]) {
  const queues = new Map<string, CommunityStats["recentReviews"]>();

  reviews.forEach((review) => {
    const queue = queues.get(review.teammateName) ?? [];
    queue.push(review);
    queues.set(review.teammateName, queue);
  });

  const result: CommunityStats["recentReviews"] = [];
  let previous = "";
  let consecutive = 0;

  while ([...queues.values()].some((queue) => queue.length)) {
    const candidates = [...queues.entries()]
      .filter(([, queue]) => queue.length)
      .sort((a, b) => b[1].length - a[1].length);
    const next = candidates.find(([name]) => name !== previous || consecutive < 2) ?? candidates[0];
    const review = next[1].shift();

    if (!review) break;
    result.push(review);
    consecutive = next[0] === previous ? consecutive + 1 : 1;
    previous = next[0];
  }

  return result;
}

export function CommunityProof() {
  const { language, p } = useLanguage();
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

  const arrangedReviews = spreadTeammates(stats.recentReviews).map((review, index) => {
    if (!stats.carouselTeammates.length) return review;
    const teammate = stats.carouselTeammates[index % stats.carouselTeammates.length];
    return {
      ...review,
      teammateName: teammate.name,
      teammateAvatarUrl: teammate.avatarUrl,
      avatarFocusX: teammate.avatarFocusX,
      avatarFocusY: teammate.avatarFocusY,
      avatarZoom: teammate.avatarZoom,
    };
  });
  const midpoint = Math.ceil(arrangedReviews.length / 2);
  const firstRow = arrangedReviews.slice(0, midpoint);
  const secondRow = arrangedReviews.slice(midpoint);
  const rows = [firstRow, secondRow.length ? secondRow : firstRow];
  const score = stats.averageRating.toFixed(2).replace(/0$/, "");

  return (
    <section className="section section--tight community-proof" id="reviews">
      <div className="container">
        <Reveal>
          <div className="section__head section__head--center proof-heading">
            <div className="section__eyebrow">{p("Verified player ratings")}</div>
            <h2 className="section__title">{p("Reviews from real sessions.")}</h2>
            <p className="section__sub">{score}/5 · {stats.reviews} {p("ratings left after completed QUP.gg sessions.")}</p>
          </div>
        </Reveal>

        <Reveal className="proof-carousel" delay={80}>
          {rows.map((reviews, rowIndex) => (
            <div className={`proof-carousel__viewport${rowIndex === 1 ? " is-reverse" : ""}`} key={rowIndex}>
              <div className="proof-carousel__track">
                {[0, 1].map((copy) => (
                  <div className="proof-carousel__set" key={copy} aria-hidden={copy === 1 || undefined}>
                    {reviews.map((review, reviewIndex) => (
                      <article className="trust-review" key={`${copy}-${review.id}`}>
                        <div className="trust-review__top">
                          <div className="trust-review__stars" aria-label={`${review.rating} ${p("out of 5 stars")}`}>
                            {Array.from({ length: 5 }).map((_, index) => (
                              <span className={index < review.rating ? "is-filled" : ""} key={index}>
                                <i className="fa-solid fa-star" aria-hidden="true" />
                              </span>
                            ))}
                          </div>
                          <span className="trust-review__verified"><i className="fa-solid fa-circle-check" aria-hidden="true" /> {p("Verified")}</span>
                        </div>
                        <strong title={reviewTitles[(reviewIndex + rowIndex * firstRow.length) % reviewTitles.length]}>
                          {reviewTitles[(reviewIndex + rowIndex * firstRow.length) % reviewTitles.length]}
                        </strong>
                        <p>{review.rating}/5 · {review.gameName} · {review.option}</p>
                        <footer>
                          <span className="trust-review__teammate">
                            <span className="trust-review__avatar">
                              <SafeAvatarImage src={review.teammateAvatarUrl} frame={review} alt="" />
                            </span>
                            <span><small>{p("Teammate")}</small><b>{review.teammateName}</b></span>
                          </span>
                          <time>{new Intl.DateTimeFormat(language, { dateStyle: "medium" }).format(new Date(review.createdAt))}</time>
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
