import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GAMES, getGameBySlug } from "@/lib/games";
import { BookingWidget } from "@/components/booking/BookingWidget";

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

export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const game = getGameBySlug(slug);
  if (!game) notFound();

  return (
    <main className="booking-page">
      <div className="container">
        <BookingWidget game={game} />
      </div>
    </main>
  );
}
