import { WHY_US } from "@/lib/content";
import { Reveal } from "@/components/ui/Reveal";

export function WhyUs() {
  return (
    <section className="section section-relative" id="why-us">
      <div className="bg-grid" aria-hidden="true" />
      <span className="bg-glow bg-glow--teal" style={{ width: 420, height: 420, left: "-160px", bottom: "-140px" }} aria-hidden="true" />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <Reveal>
          <div className="section__head section__head--center">
            <div className="section__eyebrow">Why TeamLink</div>
            <h2 className="section__title">Built for players who want more.</h2>
          </div>
        </Reveal>

        <div className="why-grid">
          {WHY_US.map((item, i) => (
            <Reveal key={item.title} delay={i * 70}>
              <div className="why-card" style={{ ["--item-color" as string]: item.color }}>
                <span className="why-card__icon">
                  <i className={item.icon} aria-hidden="true" />
                </span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
