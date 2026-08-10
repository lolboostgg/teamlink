import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { StructuredData } from "@/components/seo/StructuredData";
import { faqSchema, pageMetadata } from "@/lib/seo";
import { FAQ_ITEMS } from "@/lib/content";
import { CommunityMarquee } from "@/components/home/CommunityMarquee";
import { HowItWorks } from "@/components/home/HowItWorks";
import { BentoFeatures } from "@/components/home/BentoFeatures";
import { CtaBand } from "@/components/home/CtaBand";

// The root layout's defaults cover the title and the social card; what it
// cannot give is a canonical, and the homepage is the one URL most likely to
// be reached by several hostnames at once.
export const metadata: Metadata = pageMetadata({
  title: "Book a Verified Gaming Teammate",
  description:
    "Play with a verified teammate in League of Legends, Valorant, Fortnite and more. Matched in under two minutes, no account sharing, cancel any time.",
  path: "/",
});

export default function HomePage() {
  return (
    <main>
      {/* The same questions the page answers below, in the form a search
          result can quote. */}
      <StructuredData schemas={[faqSchema(FAQ_ITEMS)]} />
      <Hero />
      <CommunityMarquee />
      <HowItWorks />
      <BentoFeatures />
      <CtaBand />
    </main>
  );
}
