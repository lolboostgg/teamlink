import type { Metadata } from "next";
import { GAMES, getGameBySlug } from "@/lib/games";

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
  return {
    title: `Book a ${game.name} Teammate`,
    description: `Get matched with a verified ${game.name} teammate in under two minutes.`,
  };
}

// All actual content lives in layout.tsx (see comment there) — this page
// only exists to own generateStaticParams/generateMetadata for the segment.
export default function GamePage() {
  return null;
}
