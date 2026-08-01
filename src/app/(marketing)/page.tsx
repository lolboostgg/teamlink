import { Hero } from "@/components/home/Hero";
import { CommunityMarquee } from "@/components/home/CommunityMarquee";
import { BentoFeatures } from "@/components/home/BentoFeatures";
import { GamesDense } from "@/components/home/GamesDense";
import { Faq } from "@/components/home/Faq";
import { CtaBand } from "@/components/home/CtaBand";

// Kept deliberately short — the hero's picker + mode + price flow already
// demonstrates "how it works", so there's no separate numbered-steps section.
export default function HomePage() {
  return (
    <main>
      <Hero />
      <CommunityMarquee />
      <BentoFeatures />
      <GamesDense />
      <Faq />
      <CtaBand />
    </main>
  );
}
