import { Hero } from "@/components/home/Hero";
import { PopularGames } from "@/components/home/PopularGames";
import { CommunityMarquee } from "@/components/home/CommunityMarquee";
import { HowItWorks } from "@/components/home/HowItWorks";
import { WhyUs } from "@/components/home/WhyUs";
import { Faq } from "@/components/home/Faq";
import { CtaBand } from "@/components/home/CtaBand";

// Variant A — "Classic flow": full-bleed image hero with a game picker,
// then a vertical stack of marketing sections. Closest to tapin.gg's
// visual language (bold centered hero, pill game picker) without
// embedding the booking widget itself on the homepage.
export function VariantA() {
  return (
    <>
      <Hero />
      <PopularGames />
      <CommunityMarquee />
      <HowItWorks />
      <WhyUs />
      <Faq />
      <CtaBand />
    </>
  );
}
