import { Hero } from "@/components/home/Hero";
import { PopularGames } from "@/components/home/PopularGames";
import { HowItWorks } from "@/components/home/HowItWorks";
import { WhyUs } from "@/components/home/WhyUs";
import { Faq } from "@/components/home/Faq";
import { CtaBand } from "@/components/home/CtaBand";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <PopularGames />
      <HowItWorks />
      <WhyUs />
      <Faq />
      <CtaBand />
    </main>
  );
}
