import Link from "next/link";

export function CtaBand() {
  return (
    <section className="cta-band">
      <div className="container">
        <h2 className="cta-band__title">Ready to find your teammate?</h2>
        <p className="cta-band__sub">Get matched in under two minutes — no commitment, cancel anytime.</p>
        <div className="cta-band__actions">
          <Link className="btn btn--primary" href="/games">
            Browse games
          </Link>
          <Link className="btn btn--outline" href="/signup">
            Create free account
          </Link>
        </div>
      </div>
    </section>
  );
}
