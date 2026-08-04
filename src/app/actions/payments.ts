"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  chargeSavedCard,
  createCheckoutSession,
  createCustomer,
  detachPaymentMethod,
  stripeConfigured,
  StripeError,
} from "@/lib/stripe";

async function origin(): Promise<string> {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export interface StartCheckoutInput {
  amountEUR: number;
  description: string;
  /** Where to come back to; the session id is appended. */
  returnPath: string;
  kind?: "ORDER" | "EXTRA_GAMES" | "TIP";
  orderId?: string;
  /** Required when there is no signed-in account. */
  guestEmail?: string;
  saveCard?: boolean;
}

/**
 * Opens a hosted Stripe checkout and records the attempt.
 *
 * The Charge row is written *before* the redirect so a customer who pays and
 * then closes the tab is still reconciled by the webhook — the redirect back
 * is a convenience, never the proof that money moved.
 */
export async function startCheckout(input: StartCheckoutInput): Promise<{ url: string }> {
  if (!stripeConfigured()) throw new Error("Payments aren't configured yet.");

  const amountEUR = Math.round(input.amountEUR * 100) / 100;
  if (!Number.isFinite(amountEUR) || amountEUR <= 0) throw new Error("Invalid amount.");

  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, email: true, name: true, stripeCustomerId: true },
      })
    : null;

  const guestEmail = input.guestEmail?.trim().toLowerCase();
  if (!user && !guestEmail) throw new Error("An email address is required to check out.");

  let customerId = user?.stripeCustomerId ?? undefined;
  if (user && !customerId) {
    const customer = await createCustomer({ email: user.email, name: user.name, userId: user.id });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
  }

  const base = await origin();
  const checkout = await createCheckoutSession({
    amountEUR,
    description: input.description,
    successUrl: `${base}${input.returnPath}${input.returnPath.includes("?") ? "&" : "?"}checkout={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}${input.returnPath}${input.returnPath.includes("?") ? "&" : "?"}checkout=cancelled`,
    customerId,
    customerEmail: guestEmail,
    saveCard: input.saveCard ?? true,
    metadata: {
      ...(user ? { userId: user.id } : {}),
      ...(input.orderId ? { orderId: input.orderId } : {}),
      kind: input.kind ?? "ORDER",
    },
    idempotencyKey: randomUUID(),
  });

  if (!checkout.url) throw new Error("Stripe didn't return a checkout URL.");

  await prisma.charge.create({
    data: {
      userId: user?.id ?? null,
      guestEmail: user ? null : (guestEmail ?? null),
      orderId: input.orderId ?? null,
      kind: input.kind ?? "ORDER",
      amountEUR,
      stripeSessionId: checkout.id,
      status: "PENDING",
    },
  });

  return { url: checkout.url };
}

export interface QuickChargeInput {
  amountEUR: number;
  description: string;
  kind: "EXTRA_GAMES" | "TIP";
  orderId?: string;
}

/**
 * Charges the saved card without leaving the page — the "one more game" and
 * tip buttons.
 *
 * Returns `requiresAction` when the issuer wants 3-D Secure: an off-session
 * charge cannot answer that challenge, so the caller has to put the customer
 * through checkout instead of pretending it worked.
 */
export async function chargeDefaultCard(
  input: QuickChargeInput,
): Promise<{ ok: true } | { ok: false; requiresAction: boolean; error: string }> {
  if (!stripeConfigured()) return { ok: false, requiresAction: false, error: "Payments aren't configured yet." };

  const session = await auth();
  if (!session?.user?.id) return { ok: false, requiresAction: false, error: "Sign in to pay with a saved card." };

  const amountEUR = Math.round(input.amountEUR * 100) / 100;
  if (!Number.isFinite(amountEUR) || amountEUR <= 0) {
    return { ok: false, requiresAction: false, error: "Invalid amount." };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      stripeCustomerId: true,
      savedCards: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], take: 1 },
    },
  });

  const card = user?.savedCards[0];
  if (!user?.stripeCustomerId || !card) {
    return { ok: false, requiresAction: true, error: "No saved card — pay once to store one." };
  }

  // Written first so a charge that succeeds at Stripe but fails on the way
  // back to us is still reconciled by the webhook.
  const charge = await prisma.charge.create({
    data: {
      userId: user.id,
      orderId: input.orderId ?? null,
      savedCardId: card.id,
      kind: input.kind,
      amountEUR,
      status: "PENDING",
    },
  });

  try {
    const intent = await chargeSavedCard({
      customerId: user.stripeCustomerId,
      paymentMethodId: card.stripePaymentMethodId,
      amountEUR,
      description: input.description,
      metadata: { userId: user.id, kind: input.kind, ...(input.orderId ? { orderId: input.orderId } : {}) },
      // Our own row id: retrying this exact charge can never take the money
      // twice, however many times the button is clicked.
      idempotencyKey: charge.id,
    });

    await prisma.charge.update({
      where: { id: charge.id },
      data: {
        stripePaymentIntentId: intent.id,
        status: intent.status === "succeeded" ? "SUCCEEDED" : "REQUIRES_ACTION",
      },
    });

    if (intent.status !== "succeeded") {
      return { ok: false, requiresAction: true, error: "Your bank wants to confirm this payment." };
    }

    revalidatePath("/dashboard/client/wallet");
    return { ok: true };
  } catch (err) {
    const message = err instanceof StripeError ? err.message : "The payment could not be taken.";
    await prisma.charge.update({
      where: { id: charge.id },
      data: { status: "FAILED", failureMessage: message },
    });
    // An expired or withdrawn card has to go through checkout again.
    const requiresAction = err instanceof StripeError && err.code === "authentication_required";
    return { ok: false, requiresAction, error: message };
  }
}

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
