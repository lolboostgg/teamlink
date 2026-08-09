import { Reveal } from "@/components/ui/Reveal";
import { PriceTag } from "@/components/currency/PriceTag";

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

          <Reveal className="bento__cell bento__cell--wide" delay={70}>
            <div className="bento-card">
              <h3>Fair price</h3>
              <p>We keep pricing transparent: no hidden fees, no surprise add-ons.</p>
              <div className="bento-card__price-compare">
                <div className="bento-card__price-row">
                  <span>Others charge</span>
                  <PriceTag amountEUR={54.99} className="bento-card__price bento-card__price--old" />
                </div>
                <div className="bento-card__price-row">
                  <span>QUP.gg</span>
                  <PriceTag amountEUR={38.99} className="bento-card__price" />
                </div>
              </div>
              <span className="bento-card__badge">Best value</span>
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
