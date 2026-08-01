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
    <main className="booking-page section-relative">
      <span className="bg-glow bg-glow--blue" style={{ width: 480, height: 480, right: "-160px", top: "-100px" }} aria-hidden="true" />
      <span className="bg-glow bg-glow--teal" style={{ width: 360, height: 360, left: "-140px", bottom: "0" }} aria-hidden="true" />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <BookingWidget game={game} />
      </div>
    </main>
  );
}
