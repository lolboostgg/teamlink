"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { SafeAvatarImage } from "@/components/ui/SafeAvatarImage";
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

          {stats.ratedTeammates.length > 0 && (
            <Reveal className="proof__people" delay={120}>
              <div className="proof__people-head">
                <div><span className="proof__people-kicker">Top rated</span><h3>Teammates players loved</h3></div>
                <Link href="/games" className="proof__cta">Find your teammate <i className="fa-solid fa-arrow-right" aria-hidden="true" /></Link>
              </div>
              <ul className="proof__list">
                {stats.ratedTeammates.map((teammate, index) => (
                  <li className="proof-person" key={teammate.id}>
                    <span className="proof-person__rank">{String(index + 1).padStart(2, "0")}</span>
                    <span className="proof-person__avatar"><SafeAvatarImage src={teammate.avatarUrl} frame={teammate} /></span>
                    <span className="proof-person__body">
                      <span className="proof-person__name">{teammate.name}</span>
                      <span className="proof-person__meta">{teammate.reviewCount} verified {teammate.reviewCount === 1 ? "rating" : "ratings"}</span>
                    </span>
                    <span className="proof-person__rating"><i className="fa-solid fa-star" aria-hidden="true" /> {teammate.rating.toFixed(2).replace(/0$/, "")}</span>
                    {teammate.sessions > 0 && <span className="proof-person__sessions">{teammate.sessions} sessions</span>}
                  </li>
                ))}
              </ul>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
