import { gameIcon } from "@/lib/gameArt";
import { GAMES } from "@/lib/games";

/**
 * A game in a list row: the icon carries the identity, the name is only
 * there for screen readers and as a tooltip. Rows stay scannable at a glance
 * instead of every line starting with the same long title.
 */
export function GameMark({ slug, size = 32 }: { slug: string; size?: number }) {
  const game = GAMES.find((g) => g.slug === slug);
  const name = game?.name ?? slug;

  return (
    <span className="game-mark" title={name} style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={gameIcon(slug)} alt={name} />
    </span>
  );
}

/** Icon plus the short code, for places where the game still needs naming. */
export function GameMarkRow({ slug }: { slug: string }) {
  const game = GAMES.find((g) => g.slug === slug);
  return (
    <span className="game-mark-row">
      <GameMark slug={slug} size={26} />
      <span>{game?.shortName ?? slug}</span>
    </span>
  );
}
