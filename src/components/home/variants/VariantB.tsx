import { HeroSplitBooking } from "./HeroSplitBooking";
import { HowItWorksZigzag } from "./HowItWorksZigzag";
import { WhyUsStrip } from "./WhyUsStrip";
import { Faq } from "@/components/home/Faq";
import { CtaBand } from "@/components/home/CtaBand";

// Variant B — "Book in the hero": the primary affordance is configuring a
// session directly on the homepage (game + mode + price), not browsing
// into a separate page first. Closest to tapin.gg's actual homepage.
export function VariantB() {
  return (
    <>
      <HeroSplitBooking />
      <HowItWorksZigzag />
      <WhyUsStrip />
      <Faq />
      <CtaBand />
    </>
  );
}
