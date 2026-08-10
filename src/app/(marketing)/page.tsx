import type { Metadata } from "next";
import { Hero } from "@/components/home/Hero";
import { getCommunityStats } from "@/lib/community";
import { StructuredData } from "@/components/seo/StructuredData";
import { faqSchema, pageMetadata } from "@/lib/seo";
import { FAQ_ITEMS } from "@/lib/content";
import { CommunityProof } from "@/components/home/CommunityProof";
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

// ISR, not fully static: the hero badge quotes the real rating, and a number
// that is read has to be re-read sometimes. Five minutes is far longer than
// the figures move and still one render per five minutes rather than per
// visitor.
export const revalidate = 300;

export default async function HomePage() {
  const community = await getCommunityStats();

  return (
    <main>
      {/* The same questions the page answers below, in the form a search
          result can quote. */}
      <StructuredData schemas={[faqSchema(FAQ_ITEMS)]} />
      <Hero reviews={community.reviews} averageRating={community.averageRating} />
      <CommunityProof />
      <HowItWorks />
      <BentoFeatures />
      <CtaBand />
    </main>
  );
}
