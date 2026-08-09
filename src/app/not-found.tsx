import type { Metadata } from "next";
import Link from "next/link";
import { SiteTopbar } from "@/components/layout/SiteTopbar";
import { Footer } from "@/components/layout/Footer";
import { AmbientGameBackground } from "@/components/home/AmbientGameBackground";
import { GameShowcaseCard } from "@/components/home/GameShowcaseCard";
import { GAMES } from "@/lib/games";
import { COMPANY, supportMailto } from "@/lib/company";

export const metadata: Metadata = {
  title: "Page not found",
  description: "That page isn't here — pick a game and get matched instead.",
};

// The four biggest games by roster, so the way out of a dead end is the
// same one-click booking entry the homepage leads with rather than a bare
// "go home" link.
const PICKS = GAMES.slice(0, 4);

/**
 * The site-wide 404 — both for notFound() thrown outside the dashboards and
 * for any URL that matches no route at all (Next routes unmatched requests
 * to the root not-found; see next/dist/docs .../file-conventions/not-found).
 *
 * It sits outside the (marketing) group, so the header and footer are
 * mounted here explicitly — a 404 stripped of the site chrome reads like the
 * server fell over rather than like a page of ours that happens to be empty.
 *
 * The dashboards deliberately do NOT land here: their own not-found files
 * redirect to their overview instead, since a signed-in dead end always has
 * a better destination than a marketing page.
 */
export default function NotFound() {
  return (
    <div className="site-shell">
      <SiteTopbar />

      <main className="notfound">
        {/* Same ambient treatment as the hero, pinned to one game rather than
            a hovered one — there is no picker on this page to drive it. */}
        <AmbientGameBackground slug={GAMES[0].slug} />
        <span className="notfound__scrim" aria-hidden="true" />
        <span className="notfound__code" aria-hidden="true">
          404
        </span>

        <div className="container notfound__inner">
          <span className="notfound__eyebrow">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" /> Error 404
          </span>

          {/* The brand line is "Ready. Queue. Play." — this is that line's
              dead end, so it borrows the same accented word. */}
          <h1 className="notfound__title">
            This page never <span className="notfound__title-accent">queued</span> up
          </h1>

          <p className="notfound__sub">
            The link is broken, the page moved, or it was never here. Nothing on your side is affected — your account,
            your credit and any running order are all untouched.
          </p>

          <div className="notfound__cta">
            <Link href="/" className="btn btn--vivid btn--lg">
              <i className="fa-solid fa-bolt" aria-hidden="true" /> Play now
            </Link>
            <Link href="/games" className="btn btn--ghost btn--lg">
              Browse all games
            </Link>
          </div>

          <div className="notfound__picks">
            <span className="notfound__picks-label">Or jump straight into a game</span>
            <div className="notfound__picks-grid">
              {PICKS.map((game) => (
                <GameShowcaseCard key={game.slug} game={game} className="notfound__picks-card" />
              ))}
            </div>
          </div>

          <p className="notfound__help">
            Followed a link we sent you? Tell us where it pointed —{" "}
            <a href={supportMailto("Broken link")}>{COMPANY.support}</a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
