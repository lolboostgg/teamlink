import { Reveal } from "@/components/ui/Reveal";
import { FloatingShapes } from "@/components/ui/FloatingShapes";
import { TrustBadge } from "@/components/ui/TrustBadge";
import { QuickBookCard } from "@/components/home/QuickBookCard";

// Split hero: copy on the left, a live booking preview on the right — the
// primary affordance is "configure right here", matching tapin.gg's actual
// homepage where the full booking flow lives in the hero itself, rather
// than sending visitors to a separate page first. No hero photo — see
// GameCover.tsx for why (lolboost.gg hotlink reliability).
export function Hero() {
  return (
    <section className="hero-split section-relative">
      <span className="bg-glow bg-glow--blue" style={{ width: 480, height: 480, left: "-140px", top: "-140px" }} aria-hidden="true" />
      <div className="bg-grid" aria-hidden="true" />
      <FloatingShapes />

      <div className="container hero-split__grid" style={{ position: "relative", zIndex: 1 }}>
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
            <TrustBadge />
          </Reveal>
        </div>

        <Reveal delay={120}>
          <QuickBookCard />
        </Reveal>
      </div>
    </section>
  );
}
