"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { DEFAULT_FRAME, MAX_ZOOM, MIN_ZOOM, clampPercent } from "@/lib/avatarFrame";
import { actionFailure, describeActionError, type ActionResult } from "@/lib/actionError";

// Failures are returned, not thrown: Next rewrites the message of anything
// thrown out of a server action in production, so a thrown one reaches the
// form as its "An error occurred in the Server Components render" placeholder
// — see lib/actionError.ts.
export async function updateProfile(input: {
  name: string;
  avatarUrl: string;
  avatarFocusX?: number;
  avatarFocusY?: number;
  avatarZoom?: number;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return actionFailure("Not signed in.");

  const name = input.name.trim();
  if (!name) return actionFailure("Name is required.");

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name,
        avatarUrl: input.avatarUrl.trim() || null,
        avatarFocusX: clampPercent(input.avatarFocusX ?? DEFAULT_FRAME.focusX),
        avatarFocusY: clampPercent(input.avatarFocusY ?? DEFAULT_FRAME.focusY),
        avatarZoom: clampPercent(input.avatarZoom ?? DEFAULT_FRAME.zoom, MIN_ZOOM, MAX_ZOOM),
      },
    });
  } catch (err) {
    return actionFailure(describeActionError("client/updateProfile", err));
  }

  revalidatePath("/dashboard/client/profile");
  revalidatePath("/dashboard/admin/profile");
  return { ok: true };
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return actionFailure("Not signed in.");
  if (input.newPassword.length < 8) return actionFailure("New password must be at least 8 characters.");

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user?.passwordHash) {
      return actionFailure("This account signed up via Discord/Google and has no password to change.");
    }

    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) return actionFailure("Current password is incorrect.");

    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash } });
  } catch (err) {
    return actionFailure(describeActionError("client/changePassword", err));
  }

  return { ok: true };
}
