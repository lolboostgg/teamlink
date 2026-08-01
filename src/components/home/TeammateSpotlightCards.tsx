const SPOTLIGHT_CARDS = [
  { name: "Nova", flag: "🇩🇪", rank: "Challenger", rating: "4.9", variant: "split-top" as const },
  { name: "Kestrel", flag: "🇸🇪", rank: "Radiant", rating: "5.0", variant: "split-bottom" as const },
];

// Floating teammate profile cards over the hero globe — the "someone real
// is on the other side" social proof tapin.gg's floating player cards
// communicate, using the same placeholder-identity approach as the rest of
// the site (initials, no fabricated photos/names of real people).
export function TeammateSpotlightCards() {
  return (
    <div className="hero-mockups" aria-hidden="true">
      <div className="hero-globe" />
      {SPOTLIGHT_CARDS.map((c) => (
        <div key={c.name} className={`hero-mockup hero-mockup--${c.variant}`}>
          <div className="hero-mockup__avatar">{c.name.slice(0, 2).toUpperCase()}</div>
          <span className="hero-mockup__body">
            <strong>
              {c.name} {c.flag}
            </strong>
            <span className="hero-mockup__stars">
              <i className="fa-solid fa-star" aria-hidden="true" /> {c.rating}
            </span>{" "}
            <span className="hero-mockup__meta">· {c.rank}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
