"use client";

import { discordAvatarUrl } from "@/lib/discord";

/**
 * Compact "who is this on Discord" cell for the admin lists. Falls back to the
 * raw snowflake when the username cache is empty (an account linked before we
 * started storing the handle), and to an em dash when nothing is linked.
 */
export function DiscordTag({
  discordId,
  discordUsername,
  discordAvatar,
}: {
  discordId: string | null;
  discordUsername?: string | null;
  discordAvatar?: string | null;
}) {
  if (!discordId) return <span className="discord-tag discord-tag--empty">—</span>;

  const avatar = discordAvatarUrl(discordId, discordAvatar ?? null, 32);

  return (
    <span className="discord-tag" title={discordId}>
      <span className="discord-tag__mark" aria-hidden="true">
        <i className="fa-brands fa-discord" aria-hidden="true" />
        {avatar && (
          // A cached Discord avatar hash can expire. The brand mark remains
          // underneath and is revealed if the CDN image fails.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
        )}
      </span>
      {discordUsername ?? discordId}
    </span>
  );
}
