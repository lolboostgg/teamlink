import { WHY_US } from "@/lib/content";

export function WhyUs() {
  return (
    <section className="section" id="why-us">
      <div className="container">
        <div className="section__head section__head--center">
          <div className="section__eyebrow">Why TeamLink</div>
          <h2 className="section__title">Built for players who want more.</h2>
        </div>

        <div className="why-grid">
          {WHY_US.map((item) => (
            <div className="why-card" key={item.title}>
              <span className="why-card__icon">
                <i className={item.icon} aria-hidden="true" />
              </span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
