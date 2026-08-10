import { HOW_IT_WORKS } from "@/lib/content";
import { Reveal } from "@/components/ui/Reveal";

// Compact vertical timeline instead of three big cards — leaner, matches
// tapin.gg's actual "how it works" pacing (a quiet explainer, not a hero
// moment of its own).
export function HowItWorks() {
  return (
    <section className="section section--tight" id="how-it-works">
      <div className="container">
        <Reveal>
          <div className="section__head section__head--center">
            <div className="section__eyebrow">How it works</div>
            <h2 className="section__title">Play with a teammate in under 2 minutes.</h2>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="how-timeline">
            <div className="how-timeline__visual" aria-hidden="true">
              <span className="how-timeline__ring how-timeline__ring--1" />
              <span className="how-timeline__ring how-timeline__ring--2" />
              <span className="how-timeline__orbit how-timeline__orbit--1" />
              <span className="how-timeline__orbit how-timeline__orbit--2" />
              <span className="how-timeline__core"><i className="fa-solid fa-bolt" /></span>
            </div>

            <div className="how-timeline__steps">
              {HOW_IT_WORKS.map((step, index) => (
                <div className="how-timeline__step" key={step.step}>
                  <span className="how-timeline__num">{step.step}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                  <span className="how-timeline__step-glow" style={{ animationDelay: `${index * 1.1}s` }} aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
