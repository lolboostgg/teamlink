import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getGameBySlug } from "@/lib/games";
import { Hero } from "@/components/home/Hero";
import { CommunityMarquee } from "@/components/home/CommunityMarquee";
import { HowItWorks } from "@/components/home/HowItWorks";
import { BentoFeatures } from "@/components/home/BentoFeatures";
import { GamesDense } from "@/components/home/GamesDense";
import { Faq } from "@/components/home/Faq";
import { CtaBand } from "@/components/home/CtaBand";

interface Props {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}

// A /games/[slug] page is the exact same hero+booking composition as the
// homepage (see Hero.tsx), just pinned to a specific game via the URL —
// switching games here is a real navigation to a sibling /games/[slug]
// route, but since this layout stays mounted across that navigation, only
// its content re-renders instead of the page flashing.
export default async function GameLayout({ children, params }: Props) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();

  return (
    <main>
      <Hero game={game} />
      {children}
      <CommunityMarquee />
      <HowItWorks />
      <BentoFeatures />
      <GamesDense />
      <Faq />
      <CtaBand />
    </main>
  );
}
