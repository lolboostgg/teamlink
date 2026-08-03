import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { DISCORD_AUTHORIZE_URL, DISCORD_SCOPE, discordRedirectUri, isDiscordConfigured } from "@/lib/discord";

export const dynamic = "force-dynamic";

/**
 * Kicks off the Discord OAuth flow for the *signed-in* user. The random state
 * is mirrored into an httpOnly cookie so the callback can prove the redirect
 * it receives belongs to the request we started (CSRF), and the page to
 * return to rides along in the same cookie.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }

  // Only ever an in-app path, so this can't be turned into an open redirect.
  const requested = request.nextUrl.searchParams.get("returnTo") ?? "";
  const returnTo = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard/client/settings";

  if (!isDiscordConfigured()) {
    return NextResponse.redirect(new URL(`${returnTo}?discord=not_configured`, request.nextUrl.origin));
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = discordRedirectUri(request.nextUrl.origin);

  const authorizeUrl = new URL(DISCORD_AUTHORIZE_URL);
  authorizeUrl.searchParams.set("client_id", process.env.AUTH_DISCORD_ID ?? "");
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", DISCORD_SCOPE);
  authorizeUrl.searchParams.set("state", state);
  // Always show the consent screen, so re-linking to a different Discord
  // account works without logging out of Discord first.
  authorizeUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("discord_link_state", `${state}|${returnTo}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
    path: "/",
    maxAge: 10 * 60,
  });
  return response;
}
