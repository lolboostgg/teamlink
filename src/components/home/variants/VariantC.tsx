import { HeroCompactSearch } from "./HeroCompactSearch";
import { BentoFeatures } from "./BentoFeatures";
import { GamesDense } from "./GamesDense";
import { Faq } from "@/components/home/Faq";
import { CtaBand } from "@/components/home/CtaBand";

// Variant C — "Dashboard bento": compact search-first hero, no big cover
// photo, feature story told through an asymmetric bento grid with mockup
// previews instead of numbered steps. Closest to eloboost.gg.
export function VariantC() {
  return (
    <>
      <HeroCompactSearch />
      <BentoFeatures />
      <GamesDense />
      <Faq />
      <CtaBand />
    </>
  );
}
