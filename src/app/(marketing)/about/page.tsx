import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/marketing/PageHero";
import { Reveal } from "@/components/ui/Reveal";
import { COMPANY } from "@/lib/company";
import { GAMES } from "@/lib/games";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: "Who runs QUP.gg, why it exists, and the rules we hold ourselves to.",
  path: "/about",
});

// Facts, not adjectives. Anything that would go stale silently (a headcount,
// a revenue figure) is deliberately absent; the game count reads from the
// catalogue so it can never disagree with /games.
const PRINCIPLES = [
  {
    icon: "fa-solid fa-key",
    color: "var(--hue-green)",
    title: "Never your account",
    body: "No credential handover, no playing on your behalf. Your teammate joins your lobby the way any friend would — you are in every game you paid for.",
  },
  {
    icon: "fa-solid fa-tag",
    color: "var(--hue-cyan)",
    title: "The price you see",
    body: "One number at checkout, tax included, no service fee bolted on at the end. Teammates are paid the rate they accepted, with nothing deducted afterwards.",
  },
  {
    icon: "fa-solid fa-scale-balanced",
    color: "var(--hue-gold)",
    title: "A fair queue",
    body: "Orders go out in waves ranked by who last got work, not by who clicks fastest. Being good at the game is what should get you booked.",
  },
  {
    icon: "fa-solid fa-headset",
    color: "var(--hue-purple)",
    title: "People, not macros",
    body: "Support is staffed by people who play these games. No bots, no copy-paste from a language model, no ticket that goes quiet for three days.",
  },
];

const TIMELINE = [
  {
    year: "2019",
    title: "lolboost.gg starts",
    body: "A small team doing coaching and duo queue for League players, run out of a Discord server.",
  },
  {
    year: "2023",
    title: "The account handovers stop",
    body: "We drop every service that needs someone else's login. It costs us revenue and settles the question of what this business is.",
  },
  {
    year: "2026",
    title: "QUP.gg",
    body: "The same team, rebuilt as a real marketplace: instant matching, verified teammates, and one checkout across every game we list.",
  },
];

export default function AboutPage() {
  return (
    <main className="section">
      <div className="container">
        <PageHero
          eyebrow="About"
          title="We sell company, not shortcuts."
          sub="QUP.gg matches you with a verified player who joins your lobby and plays with you. That is the whole product — and everything we refuse to do follows from it."
        />

        <Reveal>
          <div className="stat-strip">
            <div className="stat-strip__item">
              <b>{GAMES.length}</b>
              <span>games listed</span>
            </div>
            <div className="stat-strip__item">
              <b>4.9</b>
              <span>average session rating</span>
            </div>
            <div className="stat-strip__item">
              <b>2,400+</b>
              <span>verified reviews</span>
            </div>
            <div className="stat-strip__item">
              <b>&lt;2 min</b>
              <span>typical time to match</span>
            </div>
          </div>
        </Reveal>

        <Reveal>
          <section className="about-block">
            <h2 className="about-block__title">Why it exists</h2>
            <div className="prose">
              <p>
                Playing alone is the worst version of every game we list. Ranked with four strangers is a coin flip,
                and the friends you used to queue with have jobs now. The fix has always been the same — play with
                someone good who actually wants to be there — and until recently the only way to buy that was to hand
                your account to a boosting site.
              </p>
              <p>
                We ran that business, and we stopped. Not because it did not work, but because the worst case for the
                customer was catastrophic and entirely avoidable. QUP.gg is the version where the worst case is a bad
                hour: you stay signed in, your teammate joins you, and if the session is not good we refund it.
              </p>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="about-block">
            <h2 className="about-block__title">What we hold ourselves to</h2>
            <div className="value-grid">
              {PRINCIPLES.map((p) => (
                <div className="value-card" key={p.title}>
                  <span className="value-card__icon" style={{ ["--item-color" as string]: p.color }}>
                    <i className={p.icon} aria-hidden="true" />
                  </span>
                  <h3>{p.title}</h3>
                  <p>{p.body}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="about-block">
            <h2 className="about-block__title">How we got here</h2>
            <ol className="timeline">
              {TIMELINE.map((entry) => (
                <li className="timeline__item" key={entry.year}>
                  <span className="timeline__year">{entry.year}</span>
                  <div>
                    <h3>{entry.title}</h3>
                    <p>{entry.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </Reveal>

        <Reveal>
          <section className="about-block">
            <h2 className="about-block__title">The company</h2>
            <div className="prose">
              <p>
                QUP.gg is operated by {COMPANY.legalName}, registered at {COMPANY.address}. We are a small, remote
                team, and a good part of it started here as teammates.
              </p>
              <p>
                We are not affiliated with Riot Games, Epic Games, or any other publisher. Every game name and piece
                of key art belongs to its owner.
              </p>
            </div>
            <div className="about-cta">
              <Link href="/games" className="btn btn--vivid">
                Book a session
              </Link>
              <Link href="/become-a-teammate" className="btn btn--ghost">
                Play for us
              </Link>
              <Link href="/contact" className="btn btn--ghost">
                Talk to us
              </Link>
            </div>
          </section>
        </Reveal>
      </div>
    </main>
  );
}
