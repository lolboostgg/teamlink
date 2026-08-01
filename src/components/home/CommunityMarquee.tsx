import { GAMES } from "@/lib/games";
import { localGameBanner } from "@/lib/gameArt";

const MEMBERS = [
  { initials: "JK", name: "Jordan K.", quote: "Matched in under 2 minutes, insane.", gameSlug: "league-of-legends", rating: 5.0 },
  { initials: "RM", name: "Riley M.", quote: "My teammate carried the whole night.", gameSlug: "valorant", rating: 4.9 },
  { initials: "AL", name: "Alex L.", quote: "Coaching sessions leveled up my aim fast.", gameSlug: "apex-legends", rating: 5.0 },
  { initials: "SV", name: "Sam V.", quote: "Booked a duo partner in seconds.", gameSlug: "fortnite", rating: 4.8 },
  { initials: "TN", name: "Taylor N.", quote: "5-star vibes every single session.", gameSlug: "teamfight-tactics", rating: 5.0 },
  { initials: "DP", name: "Drew P.", quote: "Finally hit Diamond with a real teammate.", gameSlug: "overwatch-2", rating: 4.9 },
  { initials: "KO", name: "Kai O.", quote: "Verified teammates, zero sketchy trades.", gameSlug: "marvel-rivals", rating: 5.0 },
  { initials: "MB", name: "Morgan B.", quote: "Duo queue got so much easier.", gameSlug: "rocket-league", rating: 4.9 },
] as const;

function gameShortName(slug: string): string {
  return GAMES.find((g) => g.slug === slug)?.shortName ?? "";
}

// Infinite auto-scrolling strip, styled after tapin.gg's influencer
// carousel — but with generic placeholder members instead of real people's
// names/photos, since we have no actual endorsements to show yet. Each card
// carries the real key art for the game it references, so the strip doubles
// as a second showcase of the catalog rather than plain text pills.
export function CommunityMarquee() {
  const items = [...MEMBERS, ...MEMBERS];

  return (
    <section className="section--tight marquee-section">
      <div className="container" style={{ textAlign: "center", marginBottom: 28 }}>
        <div className="section__eyebrow">Community</div>
        <h2 className="section__title" style={{ marginBottom: 0 }}>
          Loved by players everywhere
        </h2>
      </div>

      <div className="marquee">
        <div className="marquee__track">
          {items.map((m, i) => (
            <div className="marquee__card" key={i}>
              <span className="marquee__banner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={localGameBanner(m.gameSlug)} alt="" loading="lazy" />
              </span>
              <div className="marquee__body">
                <div className="marquee__top">
                  <span className="marquee__avatar">{m.initials}</span>
                  <span className="marquee__name">{m.name}</span>
                </div>
                <p className="marquee__quote">&ldquo;{m.quote}&rdquo;</p>
                <div className="marquee__foot">
                  <span className="marquee__rating">
                    <i className="fa-solid fa-star" aria-hidden="true" /> {m.rating.toFixed(1)}
                  </span>
                  <span className="marquee__game">{gameShortName(m.gameSlug)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
