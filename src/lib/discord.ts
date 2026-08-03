/**
 * Discord account linking.
 *
 * This is deliberately *not* NextAuth's Discord provider: that one signs you
 * in as (or creates) a user, which is the wrong outcome when an already
 * signed-in client just wants to attach their Discord handle. So we run the
 * plain OAuth2 code flow ourselves against the same app credentials and write
 * the result onto the current user — see app/api/discord/link + callback.
 */

export const DISCORD_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize";
export const DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token";
export const DISCORD_USER_URL = "https://discord.com/api/users/@me";

/** `identify` is enough for the snowflake + username + avatar. */
export const DISCORD_SCOPE = "identify";

export function isDiscordConfigured(): boolean {
  return Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);
}

/**
 * Resolve the browser-facing app origin. Hostinger terminates TLS in front of
 * Next.js, so `request.nextUrl.origin` can contain its internal
 * `https://0.0.0.0:3000` address and must not be sent to Discord.
 */
export function discordPublicOrigin(requestOrigin: string, headers: Headers): string {
  const configured =
    process.env.APP_URL ??
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_APP_URL;

  if (configured) return configured.replace(/\/$/, "");

  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost && !/^(?:0\.0\.0\.0|localhost|127\.0\.0\.1)(?::|$)/i.test(forwardedHost)) {
    return `${forwardedProto === "http" ? "http" : "https"}://${forwardedHost}`;
  }

  const parsed = new URL(requestOrigin);
  if (process.env.NODE_ENV === "production" && /^(?:0\.0\.0\.0|localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
    return "https://gaming.lolboost.gg";
  }
  return parsed.origin;
}

/**
 * Callback URL Discord redirects back to. Must match one of the redirect URIs
 * registered in the Discord developer portal *exactly*, including the scheme
 * and any trailing path.
 */
export function discordRedirectUri(origin: string): string {
  return `${origin.replace(/\/$/, "")}/api/discord/callback`;
}

export interface DiscordUser {
  id: string;
  username: string;
  global_name?: string | null;
  discriminator?: string | null;
  avatar?: string | null;
}

/**
 * What we store as the display name. Discord moved to unique handles, so
 * `global_name` (the display name) is preferred and `username` is the @handle;
 * legacy accounts still carry a non-"0" discriminator.
 */
export function discordDisplayName(user: DiscordUser): string {
  const base = user.global_name?.trim() || user.username;
  if (user.discriminator && user.discriminator !== "0") return `${base}#${user.discriminator}`;
  return base;
}

/** CDN URL for the avatar hash we cached at link time. */
export function discordAvatarUrl(discordId: string | null, avatarHash: string | null, size = 64): string | null {
  if (!discordId || !avatarHash) return null;
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${discordId}/${avatarHash}.${ext}?size=${size}`;
}

export async function exchangeDiscordCode(code: string, redirectUri: string): Promise<string | null> {
  const res = await fetch(DISCORD_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_DISCORD_ID ?? "",
      client_secret: process.env.AUTH_DISCORD_SECRET ?? "",
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[discord] token exchange failed:", res.status, await res.text().catch(() => ""));
    return null;
  }

  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

export async function fetchDiscordUser(accessToken: string): Promise<DiscordUser | null> {
  const res = await fetch(DISCORD_USER_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    console.error("[discord] /users/@me failed:", res.status);
    return null;
  }

  return (await res.json()) as DiscordUser;
}
