"use client";

import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { PriceTag } from "@/components/currency/PriceTag";
import { GAMES } from "@/lib/games";
import { priceFromEUR } from "@/lib/bookingOptions";
import { rankIcon } from "@/lib/gameRanks";
import { useLanguage } from "@/components/language/LanguageProvider";

// The cheapest session actually on sale, read from the catalogue rather than
// typed in — a hardcoded figure is exactly how the old one drifted away from
// the truth.
const ENTRY_PRICE_EUR = Math.min(
  ...GAMES.map((game) => priceFromEUR(game.slug)).filter((price): price is number => price !== null),
);

// Asymmetric "bento" grid with embedded mockup previews — eloboost.gg's
// signature pattern for its "Why Players Choose Us" section, quite
// different from a plain icon+text card grid.
// The order's own lifecycle, which is what the customer is really buying and
// the one thing on this page that reads better as a sequence than as a claim.
// Step four is where the privacy promise lives now: not "we would never", but
// a description of what actually happens.
const FLOW = [
  { icon: "fa-solid fa-gamepad", title: "Pick your mode", detail: "Game, session type, how many teammates." },
  { icon: "fa-solid fa-magnifying-glass", title: "We search", detail: "Waves of teammates, seconds apart." },
  { icon: "fa-solid fa-user-check", title: "Someone accepts", detail: "You see who, and their rank, before you play." },
  { icon: "fa-solid fa-tower-broadcast", title: "You play together", detail: "Your account, theirs. Nobody logs in as you." },
  { icon: "fa-solid fa-star", title: "You rate it", detail: "The score is public and decides who gets booked next." },
];

export function BentoFeatures() {
  const { p } = useLanguage();
  return (
    <section className="section" id="why-us">
      <div className="container">
        <Reveal>
          <div className="section__head section__head--center">
            <div className="section__eyebrow">{p("Why QUP.gg")}</div>
            <h2 className="section__title">{p("Why players choose us.")}</h2>
          </div>
        </Reveal>

        <div className="bento">
          {/* The tall cell, finally used for what a tall cell is good at: a
              sequence read top to bottom. It also carries the claim the old
              card made in prose — step four is where "nobody plays as you"
              stops being a promise and becomes a description. */}
          <Reveal className="bento__cell bento__cell--tall">
            <div className="bento-card">
              <div className="bento-card__icon" style={{ ["--item-color" as string]: "var(--hue-green)" }}>
                <i className="fa-solid fa-route" aria-hidden="true" />
              </div>
              <h3>{p("From click to game")}</h3>
              <p>{p("Five steps, about two minutes.")}</p>

              <ol className="flow">
                {FLOW.map((step, i) => (
                  <li className="flow__step" key={step.title} style={{ ["--i" as string]: i }}>
                    <span className="flow__mark" aria-hidden="true">
                      <i className={step.icon} />
                    </span>
                    <span className="flow__body">
                      <b>{p(step.title)}</b>
                      <small>{p(step.detail)}</small>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>

          {/* This card used to compare €54.99 against €38.99. Neither number
              belonged to anything on the site — the modes a visitor has just
              scrolled past start at €4.99 — and an invented comparison on the
              one card headed "Fair price" costs more trust than it buys.
              What is left is checkable: the real entry price, and the promise
              that it is also the price at the end. */}
          <Reveal className="bento__cell bento__cell--wide" delay={70}>
            <div className="bento-card">
              <h3>{p("The price you see is the price you pay")}</h3>
              <p>{p("No service fee at checkout, and nothing charged before a teammate takes your order.")}</p>
              <div className="bento-card__price-compare">
                <div className="bento-card__price-row">
                  <span>{p("Sessions from")}</span>
                  <PriceTag amountEUR={ENTRY_PRICE_EUR} className="bento-card__price" />
                </div>
                <div className="bento-card__price-row">
                  <span>{p("Added at checkout")}</span>
                  <span className="bento-card__price bento-card__price--nil">&euro;0.00</span>
                </div>
                <div className="bento-card__price-row">
                  <span>{p("Charged before a teammate accepts")}</span>
                  <span className="bento-card__price bento-card__price--nil">{p("Nothing")}</span>
                </div>
              </div>

              <div className="bento-card__foot">
                <span className="bento-card__badge">{p("Cancel free until matched")}</span>
                <Link className="bento-card__link" href="/legal/refunds">
                  Refund policy <i className="fa-solid fa-arrow-right" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </Reveal>

          <Reveal className="bento__cell" delay={140}>
            <div className="bento-card">
              <div className="bento-card__icon" style={{ ["--item-color" as string]: "var(--hue-gold)" }}>
                <i className="fa-solid fa-headset" aria-hidden="true" />
              </div>
              <h3>{p("Tier-1 support")}</h3>
              <p>{p("Real people who play these games. No bots, no copy-paste.")}</p>
              <div className="support-where">
                <span>
                  <i className="fa-brands fa-discord" aria-hidden="true" /> Discord
                </span>
                <span>
                  <i className="fa-solid fa-comments" aria-hidden="true" /> Order chat
                </span>
                <span>
                  <i className="fa-solid fa-envelope" aria-hidden="true" /> Email
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal className="bento__cell" delay={210}>
            <div className="bento-card">
              <div className="bento-card__icon" style={{ ["--item-color" as string]: "var(--hue-pink)" }}>
                <i className="fa-solid fa-bell" aria-hidden="true" />
              </div>
              <h3>{p("Real-time updates")}</h3>
              <p>{p("Get notified the moment your teammate is ready.")}</p>
              {/* The last cell that held one sentence in a mockup-sized box.
                  Shows the thing it describes, in the same register as the
                  chat card next to it. */}
              <div className="bento-alert">
                <span className="bento-alert__icon" aria-hidden="true">
                  <i className="fa-solid fa-bell" />
                </span>
                <span className="bento-alert__copy">
                  <b>A teammate accepted your order</b>
                  <small>just now · tap to open</small>
                </span>
              </div>
            </div>
          </Reveal>

          <Reveal className="bento__cell bento__cell--wide" delay={280}>
            <div className="bento-card bento-card--chat">
              <h3>{p("Powerful real-time chat")}</h3>
              <p>Opens the moment you are matched — lanes and roles sorted before champion select.</p>
              {/* Built from the same parts as the real order room — a header
                  with who you are talking to and their rank, sender names,
                  timestamps, a read receipt, a typing indicator. Two bubbles
                  floating in a box looked like a placeholder because it was
                  missing everything that makes the real one legible.

                  Deliberately no real teammate's name or face: this is a
                  demonstration of the interface, and putting words somebody
                  never said next to their photo is the thing the rest of this
                  page was cleaned up to stop doing. */}
              <div className="bento-chat">
                <div className="bento-chat__head">
                  {/* The roster's own default avatar, so the demo is dressed
                      in the same furniture the real order room uses. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="bento-chat__avatar" src="/avatars/default.webp" alt="" />
                  <span className="bento-chat__who">
                    <b>Kayzen</b>
                    <small>
                      <span className="bento-chat__dot" /> online ·{" "}
                      <span className="bento-chat__rank">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={rankIcon("league-of-legends", "grandmaster") ?? ""} alt="" />
                        Grandmaster
                      </span>
                    </small>
                  </span>
                  <span className="bento-chat__order">#1042</span>
                </div>

                <div className="bento-chat__thread">
                  <div className="bento-chat__msg bento-chat__msg--in">
                    <span className="bento-chat__bubble">Ready when you are 👋 I&rsquo;ll go mid, you take jungle?</span>
                    <span className="bento-chat__time">21:04</span>
                  </div>
                  <div className="bento-chat__msg bento-chat__msg--out">
                    <span className="bento-chat__bubble">Sounds good — queueing now</span>
                    <span className="bento-chat__time">
                      21:04 <i className="fa-solid fa-check-double" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="bento-chat__typing" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>

                <div className="bento-chat__input">
                  <span>Type a message…</span>
                  <i className="fa-solid fa-paper-plane" aria-hidden="true" />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
