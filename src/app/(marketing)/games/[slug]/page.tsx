import type { Metadata } from "next";
import { GAMES, getGameBySlug } from "@/lib/games";
import { StructuredData } from "@/components/seo/StructuredData";
import { gameServiceSchema, pageMetadata } from "@/lib/seo";
import { heroCardBackground } from "@/lib/gameArt";
import { priceFromEUR } from "@/lib/bookingOptions";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) return {};
  return pageMetadata({
    title: `Book a ${game.name} Teammate`,
    description: `Get matched with a verified ${game.name} teammate in under two minutes. No account sharing, no waiting rooms.`,
    path: `/games/${game.slug}`,
  });
}

// All visible content lives in layout.tsx (see the comment there) — this page
// owns generateStaticParams/generateMetadata for the segment, and the one
// piece of markup that has to be per-game rather than per-segment: the
// Service node telling a search engine what is bookable here and from what
// price.
export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) return null;

  return (
    <StructuredData
      schemas={[
        gameServiceSchema({
          name: game.name,
          slug: game.slug,
          description: `Book a verified ${game.name} teammate on QUP.gg and get matched in under two minutes.`,
          priceFromEUR: priceFromEUR(game.slug),
          image: heroCardBackground(game.slug),
        }),
      ]}
    />
  );
}
