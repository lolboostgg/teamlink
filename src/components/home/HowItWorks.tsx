import { HOW_IT_WORKS } from "@/lib/content";
import { LOLBOOST_ASSETS } from "@/lib/assets";
import { Reveal } from "@/components/ui/Reveal";

export function HowItWorks() {
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <Reveal>
          <div className="section__head section__head--center">
            <div className="section__eyebrow">How it works</div>
            <h2 className="section__title">Play with a teammate in under 2 minutes.</h2>
            <p className="section__sub">No downloads, no waiting rooms — just pick, match, and play.</p>
          </div>
        </Reveal>

        <div className="how-steps">
          {HOW_IT_WORKS.map((step, i) => (
            <Reveal key={step.step} delay={i * 90}>
              <div className="how-step">
                <div className="how-step__img">
                  <img src={`${LOLBOOST_ASSETS}/landing/illustrations/${step.image}`} alt="" loading="lazy" />
                </div>
                <span className="how-step__number">{step.step}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
