"use client";

import { useState } from "react";
import { FAQ_ITEMS } from "@/lib/content";
import { Reveal } from "@/components/ui/Reveal";

export function Faq() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="section section-relative" id="faq">
      <span className="bg-glow bg-glow--blue" style={{ width: 380, height: 380, right: "-120px", top: "10%" }} aria-hidden="true" />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <Reveal>
          <div className="section__head section__head--center">
            <div className="section__eyebrow">FAQ</div>
            <h2 className="section__title">Frequently asked questions</h2>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="faq">
            {FAQ_ITEMS.map((item, i) => (
              <div className={`faq-row${openIndex === i ? " is-open" : ""}`} key={item.q}>
                <button
                  type="button"
                  className="faq-row__btn"
                  onClick={() => setOpenIndex(openIndex === i ? -1 : i)}
                  aria-expanded={openIndex === i}
                >
                  <span>{item.q}</span>
                  <i className="fa-solid fa-plus faq-row__icon" aria-hidden="true" />
                </button>
                {openIndex === i && <div className="faq-row__panel faq-row__panel--anim">{item.a}</div>}
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
