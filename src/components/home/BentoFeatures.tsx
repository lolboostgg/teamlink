import { Reveal } from "@/components/ui/Reveal";
import { PriceTag } from "@/components/currency/PriceTag";
import { GAMES } from "@/lib/games";
import { priceFromEUR } from "@/lib/bookingOptions";

// The cheapest session actually on sale, read from the catalogue rather than
// typed in — a hardcoded figure is exactly how the old one drifted away from
// the truth.
const ENTRY_PRICE_EUR = Math.min(
  ...GAMES.map((game) => priceFromEUR(game.slug)).filter((price): price is number => price !== null),
);

// Asymmetric "bento" grid with embedded mockup previews — eloboost.gg's
// signature pattern for its "Why Players Choose Us" section, quite
// different from a plain icon+text card grid.
export function BentoFeatures() {
  return (
    <section className="section" id="why-us">
      <div className="container">
        <Reveal>
          <div className="section__head section__head--center">
            <div className="section__eyebrow">Why QUP.gg</div>
            <h2 className="section__title">Why players choose us.</h2>
          </div>
        </Reveal>

        <div className="bento">
          <Reveal className="bento__cell bento__cell--tall">
            <div className="bento-card">
              <div className="bento-card__icon" style={{ ["--item-color" as string]: "var(--hue-green)" }}>
                <i className="fa-solid fa-shield-halved" aria-hidden="true" />
              </div>
              <h3>Privacy first</h3>
              <p>Your account credentials and personal data stay safe with us, always.</p>
              <div className="bento-card__chips">
                <span><i className="fa-solid fa-lock" aria-hidden="true" /> Secure login</span>
                <span><i className="fa-solid fa-user-shield" aria-hidden="true" /> Encrypted credentials</span>
                <span><i className="fa-solid fa-shield" aria-hidden="true" /> 256-bit protected</span>
              </div>
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
              <h3>The price you see is the price you pay</h3>
              <p>No service fee bolted on at checkout, no surprise add-ons, and nothing charged before a teammate takes your order.</p>
              <div className="bento-card__price-compare">
                <div className="bento-card__price-row">
                  <span>Sessions from</span>
                  <PriceTag amountEUR={ENTRY_PRICE_EUR} className="bento-card__price" />
                </div>
                <div className="bento-card__price-row">
                  <span>Added at checkout</span>
                  <span className="bento-card__price bento-card__price--nil">&euro;0.00</span>
                </div>
              </div>
              <span className="bento-card__badge">Cancel free until matched</span>
            </div>
          </Reveal>

          <Reveal className="bento__cell" delay={140}>
            <div className="bento-card">
              <div className="bento-card__icon" style={{ ["--item-color" as string]: "var(--hue-gold)" }}>
                <i className="fa-solid fa-headset" aria-hidden="true" />
              </div>
              <h3>Tier-1 support</h3>
              <p>Real humans, no bots, no ChatGPT copy-paste answers.</p>
            </div>
          </Reveal>

          <Reveal className="bento__cell" delay={210}>
            <div className="bento-card">
              <div className="bento-card__icon" style={{ ["--item-color" as string]: "var(--hue-pink)" }}>
                <i className="fa-solid fa-bell" aria-hidden="true" />
              </div>
              <h3>Real-time updates</h3>
              <p>Get notified the moment your teammate is ready.</p>
            </div>
          </Reveal>

          <Reveal className="bento__cell bento__cell--wide" delay={280}>
            <div className="bento-card bento-card--chat">
              <h3>Powerful real-time chat</h3>
              <p>Communicate instantly with your teammate.</p>
              <div className="bento-chat">
                <div className="bento-chat__bubble bento-chat__bubble--in">Ready when you are 👋</div>
                <div className="bento-chat__bubble bento-chat__bubble--out">Let&rsquo;s go!</div>
                <div className="bento-chat__input">
                  <span>Type a message...</span>
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
