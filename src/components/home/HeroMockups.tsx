// Floating UI mockup cards — small fake product moments (match found,
// teammate rating, live price) scattered around the hero with depth and
// rotation. This is the actual visual-richness technique both tapin.gg and
// eloboost.gg lean on (floating cards / dashboard previews) instead of a
// single hero photo — and it never depends on an external image loading.
export function HeroMockups() {
  return (
    <div className="hero-mockups" aria-hidden="true">
      <div className="hero-mockup hero-mockup--match">
        <span className="hero-mockup__icon hero-mockup__icon--green">
          <i className="fa-solid fa-check" aria-hidden="true" />
        </span>
        <div>
          <strong>Match found!</strong>
          <span>Teammate joining lobby...</span>
        </div>
      </div>

      <div className="hero-mockup hero-mockup--rating">
        <div className="hero-mockup__avatar">JK</div>
        <div>
          <strong>JuggernautKid</strong>
          <span className="hero-mockup__stars">★★★★★ <em>5.0</em></span>
        </div>
      </div>

      <div className="hero-mockup hero-mockup--price">
        <span className="hero-mockup__icon hero-mockup__icon--gold">
          <i className="fa-solid fa-bolt" aria-hidden="true" />
        </span>
        <div>
          <strong>Duo session</strong>
          <span>$4.99 · 1 min away</span>
        </div>
      </div>
    </div>
  );
}
