const PLACEHOLDER_MEMBERS = [
  { initials: "JK", tag: "Diamond Player" },
  { initials: "RM", tag: "Verified Teammate" },
  { initials: "AL", tag: "Top-rated Coach" },
  { initials: "SV", tag: "Community Member" },
  { initials: "TN", tag: "5-star Session" },
  { initials: "DP", tag: "Regular Player" },
  { initials: "KO", tag: "Verified Teammate" },
  { initials: "MB", tag: "Community Member" },
];

// Infinite auto-scrolling strip, styled after tapin.gg's influencer
// carousel — but with generic placeholder members instead of real people's
// names/photos, since we have no actual endorsements to show yet.
export function CommunityMarquee() {
  const items = [...PLACEHOLDER_MEMBERS, ...PLACEHOLDER_MEMBERS];

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
              <span className="marquee__avatar">{m.initials}</span>
              <span className="marquee__tag">{m.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
