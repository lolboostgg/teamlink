import { Hero } from "@/components/home/Hero";
import { CommunityMarquee } from "@/components/home/CommunityMarquee";
import { HowItWorks } from "@/components/home/HowItWorks";
import { BentoFeatures } from "@/components/home/BentoFeatures";
import { Faq } from "@/components/home/Faq";
import { CtaBand } from "@/components/home/CtaBand";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <CommunityMarquee />
      <HowItWorks />
      <BentoFeatures />
      <Faq />
      <CtaBand />
    </main>
  );
}
