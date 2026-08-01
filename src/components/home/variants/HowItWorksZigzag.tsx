import { HOW_IT_WORKS } from "@/lib/content";
import { LOLBOOST_ASSETS } from "@/lib/assets";
import { Reveal } from "@/components/ui/Reveal";

// Alternating full-width image/text rows — structurally different from
// Variant A's 3-column card grid, closer to a classic zig-zag feature
// story (also closer to lolboost.gg's own how-it-works treatment).
export function HowItWorksZigzag() {
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <Reveal>
          <div className="section__head section__head--center">
            <div className="section__eyebrow">How it works</div>
            <h2 className="section__title">From sign-up to playing — in three steps.</h2>
          </div>
        </Reveal>

        <div className="zigzag">
          {HOW_IT_WORKS.map((step, i) => (
            <Reveal key={step.step} delay={i * 80}>
              <div className={`zigzag__row${i % 2 === 1 ? " zigzag__row--flip" : ""}`}>
                <div className="zigzag__text">
                  <span className="zigzag__number">{step.step}</span>
                  <h3>{step.title}</h3>
                  <p>{step.text}</p>
                </div>
                <div className="zigzag__visual">
                  <img src={`${LOLBOOST_ASSETS}/landing/illustrations/${step.image}`} alt="" loading="lazy" />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
