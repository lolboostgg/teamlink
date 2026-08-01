import { HOW_IT_WORKS } from "@/lib/content";
import { LOLBOOST_ASSETS } from "@/lib/assets";
import { Reveal } from "@/components/ui/Reveal";
import { FloatingShapes } from "@/components/ui/FloatingShapes";

const HOW_SHAPES = [
  { top: "8%", right: "5%", size: 40, variant: "ring" as const, duration: 10, delay: 0.3 },
  { top: "55%", left: "4%", size: 16, variant: "dot" as const, duration: 7.5, delay: 1 },
  { top: "85%", right: "18%", size: 12, variant: "dot" as const, duration: 6, delay: 0.8 },
];

export function HowItWorks() {
  return (
    <section className="section section-relative" id="how-it-works">
      <FloatingShapes shapes={HOW_SHAPES} />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
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
