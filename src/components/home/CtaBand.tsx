"use client";

import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { useAuthModal } from "@/components/auth/AuthModalProvider";

export function CtaBand() {
  const { open } = useAuthModal();

  return (
    <section className="cta-band section-relative">
      <span className="bg-glow bg-glow--blue" style={{ width: 500, height: 300, left: "50%", top: "20%", transform: "translateX(-50%)" }} aria-hidden="true" />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <Reveal>
          <h2 className="cta-band__title">Ready to find your teammate?</h2>
          <p className="cta-band__sub">Get matched in under two minutes, no commitment, cancel anytime.</p>
          <div className="cta-band__actions">
            <Link className="btn btn--primary" href="/games">
              Browse games
            </Link>
            <button type="button" className="btn btn--outline" onClick={() => open("signup")}>
              Create free account
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
