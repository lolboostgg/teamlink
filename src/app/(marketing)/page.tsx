import { Hero } from "@/components/home/Hero";
import { CommunityMarquee } from "@/components/home/CommunityMarquee";
import { HowItWorks } from "@/components/home/HowItWorks";
import { BentoFeatures } from "@/components/home/BentoFeatures";
import { GamesDense } from "@/components/home/GamesDense";
import { Faq } from "@/components/home/Faq";
import { CtaBand } from "@/components/home/CtaBand";

// The permanent homepage — composed from the strongest pieces of the three
// prototype-skill variants that were previously switchable via ?variant=
// (archived on the `archive/homepage-prototype-variants` branch): the
// booking-in-the-hero pattern (was Variant B), the bento feature grid and
// dense games grid (was Variant C), and the FAQ/CTA flow (was Variant A).
export default function HomePage() {
  return (
    <main>
      <Hero />
      <CommunityMarquee />
      <HowItWorks />
      <BentoFeatures />
      <GamesDense />
      <Faq />
      <CtaBand />
    </main>
  );
}
