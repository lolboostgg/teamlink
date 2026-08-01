import { LOLBOOST_ASSETS } from "@/lib/assets";
import { Reveal } from "@/components/ui/Reveal";
import { FloatingShapes } from "@/components/ui/FloatingShapes";
import { QuickBookCard } from "./QuickBookCard";

// Split hero: copy on the left, a live booking preview on the right —
// the primary affordance is "configure right here", not "browse then
// click into a page" (that's Variant A). Matches tapin.gg's homepage,
// where the full booking flow lives in the hero itself.
export function HeroSplitBooking() {
  return (
    <section className="hero-split">
      <div className="hero-split__bg" aria-hidden="true">
        <img src={`${LOLBOOST_ASSETS}/landing/lolboost-hero-multigame6.webp`} alt="" loading="eager" fetchPriority="high" />
      </div>
      <FloatingShapes />

      <div className="container hero-split__grid">
        <div>
          <Reveal>
            <span className="hero__eyebrow">
              <span className="pulse-dot" aria-hidden="true" /> Matched in under 2 minutes
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="hero-split__title">
              Play with a pro <span className="hero__title-accent">teammate</span> — right now.
            </h1>
          </Reveal>
          <Reveal delay={140}>
            <p className="hero__sub" style={{ margin: "0 0 24px" }}>
              Pick a game, pick a mode, and get matched in under two minutes. No downloads, no
              waiting rooms.
            </p>
          </Reveal>
          <Reveal delay={200}>
            <div className="hero__trust" style={{ marginBottom: 0 }}>
              <span className="hero__trust-stars">★★★★★</span>
              <span>4.9/5 · 2,400+ reviews</span>
            </div>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <QuickBookCard />
        </Reveal>
      </div>
    </section>
  );
}
