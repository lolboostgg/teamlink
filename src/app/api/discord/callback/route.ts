import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  discordDisplayName,
  discordPublicOrigin,
  discordRedirectUri,
  exchangeDiscordCode,
  fetchDiscordUser,
} from "@/lib/discord";

export const dynamic = "force-dynamic";

function back(request: NextRequest, returnTo: string, status: string) {
  const url = new URL(returnTo, discordPublicOrigin(request.nextUrl.origin, request.headers));
  url.searchParams.set("discord", status);
  const response = NextResponse.redirect(url);
  response.cookies.delete("discord_link_state");
  return response;
}

export async function GET(request: NextRequest) {
  const publicOrigin = discordPublicOrigin(request.nextUrl.origin, request.headers);
  const cookie = request.cookies.get("discord_link_state")?.value ?? "";
  const [expectedState, storedReturnTo] = cookie.split("|");
  const returnTo = storedReturnTo || "/dashboard/client/settings";

  const session = await auth();
  // Same as the link route: no /login page exists, sign-in is a modal.
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/?authError=AccessDenied", publicOrigin));
  }

  // The user hit "Cancel" on Discord's consent screen.
  if (request.nextUrl.searchParams.get("error")) {
    return back(request, returnTo, "cancelled");
  }

  const state = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  if (!code || !state || !expectedState || state !== expectedState) {
    return back(request, returnTo, "invalid_state");
  }

  const accessToken = await exchangeDiscordCode(code, discordRedirectUri(publicOrigin));
  if (!accessToken) return back(request, returnTo, "error");

  const discordUser = await fetchDiscordUser(accessToken);
  if (!discordUser?.id) return back(request, returnTo, "error");

  // discordId is unique — one Discord account can't be attached to two
  // TeamLink accounts, otherwise a DM couldn't be attributed to one person.
  const taken = await prisma.user.findUnique({ where: { discordId: discordUser.id }, select: { id: true } });
  if (taken && taken.id !== session.user.id) {
    return back(request, returnTo, "already_linked");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      discordId: discordUser.id,
      discordUsername: discordDisplayName(discordUser) || discordUser.id,
      discordAvatar: discordUser.avatar ?? null,
      discordLinkedAt: new Date(),
    },
  });

  return back(request, returnTo, "linked");
}
