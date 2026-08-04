"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { detachPaymentMethod } from "@/lib/stripe";

// Managing the cards on your own account. Taking money lives in
// lib/stripeCheckout.ts, deliberately outside this file: every export here
// is a public endpoint, and a generic "charge X" among them would let the
// caller name the amount.

export async function removeSavedCard(cardId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");

  const card = await prisma.savedCard.findFirst({ where: { id: cardId, userId: session.user.id } });
  if (!card) throw new Error("Unknown card.");

  // Detached at Stripe too, otherwise it stays chargeable there.
  await detachPaymentMethod(card.stripePaymentMethodId).catch(() => undefined);
  await prisma.savedCard.delete({ where: { id: card.id } });

  const remaining = await prisma.savedCard.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  });
  if (remaining && card.isDefault) {
    await prisma.savedCard.update({ where: { id: remaining.id }, data: { isDefault: true } });
  }

  revalidatePath("/dashboard/client/settings");
}

export async function makeCardDefault(cardId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not signed in.");

  await prisma.$transaction([
    prisma.savedCard.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } }),
    prisma.savedCard.updateMany({ where: { id: cardId, userId: session.user.id }, data: { isDefault: true } }),
  ]);

  revalidatePath("/dashboard/client/settings");
}
