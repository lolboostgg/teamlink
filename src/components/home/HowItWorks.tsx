import { HOW_IT_WORKS } from "@/lib/content";

export function HowItWorks() {
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <div className="section__head section__head--center">
          <div className="section__eyebrow">How it works</div>
          <h2 className="section__title">Play with a teammate in under 2 minutes.</h2>
          <p className="section__sub">No downloads, no waiting rooms — just pick, match, and play.</p>
        </div>

        <div className="how-steps">
          {HOW_IT_WORKS.map((step) => (
            <div className="how-step" key={step.step}>
              <span className="how-step__number">{step.step}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
