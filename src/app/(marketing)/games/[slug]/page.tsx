import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GAMES, getGameBySlug } from "@/lib/games";
import { BookingWidget } from "@/components/booking/BookingWidget";
import { GamePageHero } from "@/components/booking/GamePageHero";
import { BentoFeatures } from "@/components/home/BentoFeatures";
import { Faq } from "@/components/home/Faq";

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
    <main className="booking-page" style={{ position: "relative" }}>
      <GamePageHero game={game} />

      {/* Clips only these glow blurs (not the whole page) so the booking
          sidebar below can use position: sticky — see .glow-clip. */}
      <div className="glow-clip" aria-hidden="true">
        <span className="bg-glow bg-glow--blue" style={{ width: 480, height: 480, right: "-160px", top: "-100px" }} />
        <span className="bg-glow bg-glow--teal" style={{ width: 360, height: 360, left: "-140px", bottom: "0" }} />
      </div>

      <div className="container booking-widget-wrap" style={{ position: "relative", zIndex: 1 }}>
        <BookingWidget game={game} />
      </div>

      <BentoFeatures />
      <Faq />
    </main>
  );
}
