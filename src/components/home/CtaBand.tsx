"use client";

import Link from "next/link";
import { Reveal } from "@/components/ui/Reveal";
import { useAuthModal } from "@/components/auth/AuthModalProvider";
import { GAMES, getGameBySlug } from "@/lib/games";
import { gameBackground } from "@/lib/gameArt";
import { useLastGameSlug } from "@/lib/lastGame";
import { useLanguage } from "@/components/language/LanguageProvider";

export function CtaBand() {
  const { open } = useAuthModal();
  const lastSlug = useLastGameSlug();
  const game = (lastSlug ? getGameBySlug(lastSlug) : undefined) ?? GAMES[0];
  const { t } = useLanguage();

  return (
    <section className="cta-band section-relative" style={{ backgroundImage: `url(${gameBackground(game.slug)})` }}>
      <span className="cta-band__scrim" aria-hidden="true" />

      <div className="container" style={{ position: "relative", zIndex: 1 }}>
        <Reveal>
          <h2 className="cta-band__title">{t("cta.title")}</h2>
          <p className="cta-band__sub">{t("cta.text")}</p>
          <div className="cta-band__actions">
            <Link className="btn btn--primary" href="/games">
              {t("cta.games")}
            </Link>
            <button type="button" className="btn btn--outline" onClick={() => open("signup")}>
              {t("cta.account")}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
