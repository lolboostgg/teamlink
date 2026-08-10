"use client";

import { useEffect, useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { COMPANY } from "@/lib/company";
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

  if (!stats || stats.reviews === 0 || stats.averageRating === null) return null;

  const fiveStarShare = Math.round((stats.fiveStar / stats.reviews) * 100);
  const score = stats.averageRating.toFixed(2).replace(/0$/, "");

  return (
    <section className="section section--tight community-proof" id="reviews">
      <div className="container">
        <Reveal>
          <div className="section__head section__head--center proof-heading">
            <div className="section__eyebrow">Verified player ratings</div>
            <h2 className="section__title">Proof, not promises.</h2>
            <p className="section__sub">Every rating comes from a completed QUP.gg session.</p>
          </div>
        </Reveal>

        <div className="proof">
          <div className="proof__main">
            <Reveal className="proof__score">
              <span className="proof__verified">
                <i className="fa-solid fa-circle-check" aria-hidden="true" /> Verified sessions only
              </span>
              <div className="proof__score-lockup">
                <span className="proof__average">{score}</span>
                <span className="proof__out-of">/ 5</span>
              </div>
              <div className="proof__stars" aria-label={`${score} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, index) => (
                  <i key={index} className={`fa-solid fa-star${index < Math.round(stats.averageRating ?? 0) ? "" : " is-empty"}`} />
                ))}
              </div>
              <p className="proof__score-sub">Based on <b>{stats.reviews}</b> rated sessions</p>
              <div className="proof__metrics">
                <span><b>{fiveStarShare}%</b><small>five-star ratings</small></span>
                <span><b>{stats.completedSessions}</b><small>sessions played</small></span>
              </div>
            </Reveal>

            <Reveal className="proof__bars" delay={60}>
              <div className="proof__bars-head">
                <div><span>Rating breakdown</span><small>All completed-session ratings</small></div>
                <span className="proof__review-count">{stats.reviews} total</span>
              </div>
              <div className="proof__distribution">
                {stats.distribution.map((row) => {
                  const share = stats.reviews > 0 ? Math.round((row.count / stats.reviews) * 100) : 0;
                  return (
                    <div className="proof__bar" key={row.rating}>
                      <span className="proof__bar-label">{row.rating} <i className="fa-solid fa-star" aria-hidden="true" /></span>
                      <span className="proof__bar-track"><span className="proof__bar-fill" style={{ width: `${share}%` }} /></span>
                      <span className="proof__bar-count">{row.count}<small>{share}%</small></span>
                    </div>
                  );
                })}
              </div>
              <div className="proof__disclosure">
                <span><i className="fa-solid fa-shield-halved" aria-hidden="true" /> Ratings cannot be left before a session is completed.</span>
                <a href={COMPANY.trustpilot} target="_blank" rel="noreferrer noopener">
                  Trustpilot <i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true" />
                </a>
              </div>
            </Reveal>
          </div>

          {stats.recentReviews.length > 0 && (
            <Reveal className="proof-reviews" delay={120}>
              <div className="proof__people-head">
                <div><span className="proof__people-kicker">Latest reviews</span><h3>Rated by verified players</h3></div>
                <span className="proof-reviews__hint"><i className="fa-solid fa-circle-check" aria-hidden="true" /> Completed sessions only</span>
              </div>
              <div className="proof-reviews__viewport">
                <div className="proof-reviews__track">
                  {[0, 1].map((copy) => (
                    <div className="proof-reviews__set" key={copy} aria-hidden={copy === 1 || undefined}>
                      {stats.recentReviews.map((review) => (
                        <article className="proof-review" key={`${copy}-${review.id}`}>
                          <div className="proof-review__stars" aria-label={`${review.rating} out of 5 stars`}>
                            {Array.from({ length: 5 }).map((_, index) => <span className={index < review.rating ? "is-filled" : ""} key={index}><i className="fa-solid fa-star" /></span>)}
                          </div>
                          <strong>{review.rating}/5 session rating</strong>
                          <p>{review.gameName} · {review.option}</p>
                          <span className="proof-review__with">Played with <b>{review.teammateName}</b></span>
                          <footer><span><i className="fa-solid fa-circle-check" /> {review.clientName}</span><time>{new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(review.createdAt))}</time></footer>
                        </article>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
