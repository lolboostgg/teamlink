import { WHY_US } from "@/lib/content";
import { Reveal } from "@/components/ui/Reveal";

// Single horizontal strip with dividers, instead of Variant A's card grid —
// reads more like a trust bar than a feature showcase.
export function WhyUsStrip() {
  return (
    <section className="section--tight" id="why-us">
      <div className="container">
        <Reveal>
          <div className="why-strip">
            {WHY_US.map((item) => (
              <div className="why-strip__item" key={item.title}>
                <i className={item.icon} aria-hidden="true" />
                <div>
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
