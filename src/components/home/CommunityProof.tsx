"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
import { COMPANY } from "@/lib/company";
import type { CommunityStats } from "@/lib/community";

/**
 * What players rated us, from the ratings themselves.
 *
 * This replaced a scrolling wall of six invented testimonials — names, quotes
 * and scores that no row in the database backed. They were the least
 * believable thing on the page precisely because they were the most
 * enthusiastic, and the marquee cut the first and last card in half so none
 * of them could be read anyway.
 *
 * Reviews here carry a rating and no text, so this shows the distribution
 * rather than quotes: the average, how the stars actually fell, how many
 * sessions produced them, and the teammates who earned them. Smaller numbers
 * than the old copy implied, and checkable, which is the trade being made.
 *
 * Renders nothing at all until there is something to show. A proof section
 * proving nothing is worse than no proof section.
 */
export function CommunityProof() {
  const [stats, setStats] = useState<CommunityStats | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/community")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => live && setStats(data))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  if (!stats || stats.reviews === 0 || stats.averageRating === null) return null;

  const fiveStarShare = Math.round((stats.fiveStar / stats.reviews) * 100);
  const peak = Math.max(...stats.distribution.map((row) => row.count), 1);

  return (
    <section className="section section--tight" id="reviews">
      <div className="container">
        <Reveal>
          <div className="section__head section__head--center">
            <div className="section__eyebrow">Reviews</div>
            <h2 className="section__title">Rated by the people who played.</h2>
            <p className="section__sub">
              Every score below was left after a finished session by the person who booked it. Nothing here is
              editorial.
            </p>
          </div>
        </Reveal>

        <div className="proof">
          <Reveal className="proof__score">
            <div className="proof__average">{stats.averageRating.toFixed(2).replace(/0$/, "")}</div>
            <div className="proof__stars" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, i) => (
                <i
                  key={i}
                  className={`fa-solid fa-star${i < Math.round(stats.averageRating ?? 0) ? "" : " is-empty"}`}
                />
              ))}
            </div>
            <p className="proof__score-sub">
              out of 5, from <b>{stats.reviews}</b> rated {stats.reviews === 1 ? "session" : "sessions"}
            </p>
            <p className="proof__score-note">
              {fiveStarShare}% gave five stars · {stats.completedSessions} sessions played
            </p>
          </Reveal>

          <Reveal className="proof__bars" delay={60}>
            {stats.distribution.map((row) => (
              <div className="proof__bar" key={row.rating}>
                <span className="proof__bar-label">
                  {row.rating} <i className="fa-solid fa-star" aria-hidden="true" />
                </span>
                <span className="proof__bar-track">
                  <span className="proof__bar-fill" style={{ width: `${(row.count / peak) * 100}%` }} />
                </span>
                <span className="proof__bar-count">{row.count}</span>
              </div>
            ))}
            <p className="proof__disclosure">
              Ratings are one to five stars and carry no written comment, so there is nothing here to quote. Our
              public profile is on{" "}
              <a href={COMPANY.trustpilot} target="_blank" rel="noreferrer noopener">
                Trustpilot
              </a>
              .
            </p>
          </Reveal>

          {stats.ratedTeammates.length > 0 && (
            <Reveal className="proof__people" delay={120}>
              <h3 className="proof__people-title">Who earned them</h3>
              <ul className="proof__list">
                {stats.ratedTeammates.map((teammate) => (
                  <li className="proof-person" key={teammate.id}>
                    <span className="proof-person__avatar">
                      <SafeAvatarImage src={teammate.avatarUrl} frame={teammate} />
                    </span>
                    <span className="proof-person__body">
                      <span className="proof-person__name">{teammate.name}</span>
                      <span className="proof-person__meta">
                        <i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(2).replace(/0$/, "")}{" "}
                        · {teammate.reviewCount} {teammate.reviewCount === 1 ? "rating" : "ratings"}
                        {teammate.sessions > 0 && ` · ${teammate.sessions} sessions`}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/games" className="btn btn--ghost btn--sm proof__cta">
                Book one of them
              </Link>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
