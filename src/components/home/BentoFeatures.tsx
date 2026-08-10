import { Reveal } from "@/components/ui/Reveal";
import { PriceTag } from "@/components/currency/PriceTag";
import { GAMES } from "@/lib/games";
import { priceFromEUR } from "@/lib/bookingOptions";

/**
 * Why players choose us.
 *
 * Rebuilt from an asymmetric "bento" of five cells. That layout gave two
 * cards a paragraph of copy in a cell sized for a mockup, so they were mostly
 * air, and the one card carrying a claim carried an invented one: it struck
 * out €54.99 against €38.99 while the modes a visitor had just scrolled past
 * start at €4.99. Neither figure belonged to anything on the site.
 *
 * What replaced it is four claims of equal weight, each one a sentence
 * somebody could hold us to, plus the price panel — now showing the real
 * entry price read from the catalogue against the nothing added at checkout.
 * Every card states what it means rather than illustrating it.
 */

// The cheapest session actually on sale. Read, not typed in — a hardcoded
// figure is exactly how the old one drifted away from the truth.
const ENTRY_PRICE_EUR = Math.min(
  ...GAMES.map((game) => priceFromEUR(game.slug)).filter((price): price is number => price !== null),
);

const CLAIMS = [
  {
    icon: "fa-solid fa-key",
    color: "var(--hue-green)",
    title: "Never your account",
    body: "No credential handover and nobody playing for you. Your teammate joins your lobby the way a friend would, so you are in every game you paid for.",
  },
  {
    icon: "fa-solid fa-scale-balanced",
    color: "var(--hue-gold)",
    title: "A queue that is actually fair",
    body: "Orders go out in waves ranked by who last got work, not by who clicks fastest. Playing well is what wins the next order.",
  },
  {
    icon: "fa-solid fa-comments",
    color: "var(--accent)",
    title: "Talk before you play",
    body: "Chat opens the moment you are matched, so lanes, roles and what you are here for get sorted before champion select rather than during it.",
  },
  {
    icon: "fa-solid fa-headset",
    color: "var(--hue-purple)",
    title: "Support that plays these games",
    body: "Real people on Discord and in the order chat, under an hour through the evening. No bots and no copy-paste from a language model.",
  },
];

export function BentoFeatures() {
  return (
    <section className="section" id="why-us">
      <div className="container">
        <Reveal>
          <div className="section__head section__head--center">
            <div className="section__eyebrow">Why QUP.gg</div>
            <h2 className="section__title">Why players choose us.</h2>
            <p className="section__sub">
              Four things we will not trade away, and one number that does not change between here and the receipt.
            </p>
          </div>
        </Reveal>

        <div className="claims">
          {CLAIMS.map((claim, i) => (
            <Reveal key={claim.title} delay={i * 60}>
              <article className="claim-card">
                <span className="claim-card__icon" style={{ ["--item-color" as string]: claim.color }}>
                  <i className={claim.icon} aria-hidden="true" />
                </span>
                <h3>{claim.title}</h3>
                <p>{claim.body}</p>
              </article>
            </Reveal>
          ))}
        </div>

        <Reveal delay={80}>
          <div className="price-promise">
            <div className="price-promise__copy">
              <h3>The price you see is the price you pay</h3>
              <p>
                No service fee appears at checkout, nothing is charged before a teammate takes your order, and you can
                cancel free until one does.
              </p>
            </div>
            <dl className="price-promise__figures">
              <div>
                <dt>Sessions from</dt>
                <dd>
                  <PriceTag amountEUR={ENTRY_PRICE_EUR} />
                </dd>
              </div>
              <div>
                <dt>Added at checkout</dt>
                <dd className="price-promise__nil">&euro;0.00</dd>
              </div>
              <div>
                <dt>Charged before matched</dt>
                <dd className="price-promise__nil">Nothing</dd>
              </div>
            </dl>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
