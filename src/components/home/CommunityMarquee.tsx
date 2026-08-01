import { localGameBanner, gameIcon } from "@/lib/gameArt";
import { AvatarIcon } from "@/components/ui/AvatarIcon";

const MEMBERS = [
  { id: "m-jordan", name: "Jordan K.", quote: "Matched in under 2 minutes, that's insane.", gameSlug: "league-of-legends", rating: 5.0 },
  { id: "m-riley", name: "Riley M.", quote: "My teammate carried the whole night.", gameSlug: "valorant", rating: 4.9 },
  { id: "m-alex", name: "Alex L.", quote: "Coaching sessions leveled up my aim fast.", gameSlug: "apex-legends", rating: 5.0 },
  { id: "m-sam", name: "Sam V.", quote: "Booked a duo partner in seconds.", gameSlug: "fortnite", rating: 4.8 },
  { id: "m-taylor", name: "Taylor N.", quote: "5 star vibes every single session.", gameSlug: "teamfight-tactics", rating: 5.0 },
  { id: "m-drew", name: "Drew P.", quote: "Finally hit Diamond with a real teammate.", gameSlug: "overwatch-2", rating: 4.9 },
  { id: "m-kai", name: "Kai O.", quote: "Verified teammates, zero sketchy trades.", gameSlug: "marvel-rivals", rating: 5.0 },
  { id: "m-morgan", name: "Morgan B.", quote: "Duo queue got so much easier.", gameSlug: "rocket-league", rating: 4.9 },
] as const;

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
                  <span className="marquee__avatar">
                    <AvatarIcon seed={m.id} />
                  </span>
                  <span className="marquee__name">{m.name}</span>
                </div>
                <p className="marquee__quote">&ldquo;{m.quote}&rdquo;</p>
                <div className="marquee__foot">
                  <span className="marquee__rating">
                    <i className="fa-solid fa-star" aria-hidden="true" /> {m.rating.toFixed(1)}
                  </span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gameIcon(m.gameSlug)} alt="" className="marquee__game-icon" loading="lazy" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
