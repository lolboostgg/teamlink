"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { actionFailure, describeActionError, type ActionResult } from "@/lib/actionError";
import { sanitizeTeammateProfileInput, type TeammateProfileClientInput } from "@/lib/teammateProfile";

// Teammates edit their own game profile, including which games they're
// listed for — onboarding asks them to choose those themselves. The display
// name stays admin territory.
// Returns a result rather than throwing: Next replaces the message of any
// error thrown out of a server action with its production placeholder ("An
// error occurred in the Server Components render…"), so a thrown message
// never actually reaches the form. A returned one does.
export async function updateOwnProfile(input: TeammateProfileClientInput): Promise<ActionResult> {
  const session = await auth();
  // Anyone signed in may run this — what it can actually touch is one row,
  // the Teammate whose userId is theirs, and the updateMany below is what
  // enforces that. It deliberately does *not* demand role === "TEAMMATE":
  // dashboard/teammate/layout.tsx lets an admin who also has a roster
  // profile use this dashboard (see canOpenDashboard), and requiring the
  // role meant every save of their own profile was refused — as Next's
  // masked "an error occurred in the Server Components render", since the
  // refusal was a throw.
  if (!session?.user?.id) {
    return actionFailure("You're not signed in.");
  }

  const clean = sanitizeTeammateProfileInput(input);

  try {
    // Teammates don't get a separate "account" avatar upload (only this
    // game-profile one), so mirror it onto User too — that's the row the
    // header avatar (auth.ts's session.user.image) actually reads, same as a
    // client's own profile picture. The framing travels with it: a picture
    // zoomed in here would otherwise be drawn unzoomed in the header.
    //
    // updateMany for the User row as well, deliberately: update() throws
    // P2025 when the row is gone, which would fail an otherwise perfectly
    // good profile save over a mirror nobody asked for.
    const [{ count }] = await prisma.$transaction([
      prisma.teammate.updateMany({
        where: { userId: session.user.id },
        data: {
          tagline: clean.tagline || null,
          timezone: clean.timezone || null,
          avatarUrl: clean.avatarUrl || null,
          avatarFocusX: clean.avatarFocusX,
          avatarFocusY: clean.avatarFocusY,
          avatarZoom: clean.avatarZoom,
          languages: clean.languages,
          gameSlugs: clean.gameSlugs,
          // See the note in the admin action — Prisma's Json input type needs
          // the assertion for a Record of interfaces.
          gameProfiles: clean.gameProfiles as unknown as Prisma.InputJsonObject,
          lolRank: clean.lolRank,
          lolChampions: clean.lolChampions,
          lolLanes: clean.lolLanes,
        },
      }),
      prisma.user.updateMany({
        where: { id: session.user.id },
        data: {
          avatarUrl: clean.avatarUrl || null,
          avatarFocusX: clean.avatarFocusX,
          avatarFocusY: clean.avatarFocusY,
          avatarZoom: clean.avatarZoom,
        },
      }),
    ]);
    if (count === 0) return actionFailure("No teammate profile is linked to this account.");
  } catch (err) {
    return actionFailure(describeActionError("teammate/updateOwnProfile", err));
  }

  revalidatePath("/dashboard/teammate/profile");
  revalidatePath("/dashboard/teammate/onboarding");
  return { ok: true };
}
