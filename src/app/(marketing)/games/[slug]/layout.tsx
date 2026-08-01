import type { ReactNode } from "react";
import { GAMES } from "@/lib/games";
import { GameSwitcherBar } from "@/components/booking/GameSwitcherBar";
import { BentoFeatures } from "@/components/home/BentoFeatures";
import { Faq } from "@/components/home/Faq";

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

// This layout owns everything that should stay put while the customer
// switches games (the picker strip, decorative glows, the generic
// features/FAQ sections) — Next.js does not remount a layout just because
// the dynamic slug it reads changes, so only {children} (the per-game hero
// banner + booking panel in page.tsx) actually re-renders on navigation.
export default async function GameLayout({ children, params }: Props) {
  const { slug } = await params;

  return (
    <main className="booking-page" style={{ position: "relative" }}>
      <div className="game-switcher-bar">
        <div className="container">
          <GameSwitcherBar games={GAMES} activeSlug={slug} />
        </div>
      </div>

      {children}

      <BentoFeatures />
      <Faq />
    </main>
  );
}
