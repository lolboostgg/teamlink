import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { chargeSavedCard, createCheckoutSession, createCustomer, stripeConfigured, StripeError } from "@/lib/stripe";

/**
 * The two ways money is taken, kept out of any "use server" module.
 *
 * Every export of a server-action file is a callable endpoint, so a generic
 * "charge this amount for this kind" function living there would let anyone
 * name their own price. These are plain server functions instead: only the
 * vetted actions in app/actions/* may call them, and each of those decides
 * the amount itself.
 */

async function origin(): Promise<string> {
  if (process.env.AUTH_URL) return process.env.AUTH_URL.replace(/\/$/, "");
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export type ChargeKindKey = "ORDER" | "EXTRA_GAMES" | "TIP" | "CREDITS";

export interface StartCheckoutInput {
  amountEUR: number;
  description: string;
  /** Where to come back to; the session id is appended. */
  returnPath: string;
  kind?: ChargeKindKey;
  orderId?: string;
  /** Required when there is no signed-in account. */
  guestEmail?: string;
  saveCard?: boolean;
  /** Which methods the hosted page offers; defaults to card only. */
  methods?: ("card" | "paypal")[];
  /**
   * Anything the webhook needs to finish the job — a coupon to burn, a
   * credit package to grant, the teammate a tip belongs to.
   */
  extraMetadata?: Record<string, string>;
  idempotencyKey?: string;
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

  // A guest's order money is only reserved, and taken when the session
  // actually starts (see captureOrderPayment). If the search finds nobody, or
  // they cancel first, the reservation is released and no fee is ever paid —
  // whereas a refund leaves Stripe's cut behind on money we handed straight
  // back. An account is charged outright: their cancellations end in store
  // credit, so no refund and no lost fee arises either way.
  //
  // Only the booking itself. Extra games and tips are bought mid-session, for
  // something delivered immediately, and have nothing to wait for.
  const authorizeOnly = !user && (input.kind ?? "ORDER") === "ORDER";

  const base = await origin();
  const checkout = await createCheckoutSession({
    amountEUR,
    captureMethod: authorizeOnly ? "manual" : "automatic",
    description: input.description,
    successUrl: `${base}${input.returnPath}${input.returnPath.includes("?") ? "&" : "?"}checkout={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${base}${input.returnPath}${input.returnPath.includes("?") ? "&" : "?"}checkout=cancelled`,
    customerId,
    customerEmail: guestEmail,
    saveCard: input.saveCard ?? true,
    methods: input.methods,
    metadata: {
      ...(user ? { userId: user.id } : {}),
      ...(input.orderId ? { orderId: input.orderId } : {}),
      ...(input.extraMetadata ?? {}),
      kind: input.kind ?? "ORDER",
    },
    idempotencyKey: input.idempotencyKey ?? randomUUID(),
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
  idempotencyKey?: string;
}

export type QuickChargeResult =
  | { ok: true; chargeId: string }
  | { ok: false; requiresAction: boolean; error: string };

/**
 * Charges the saved card without leaving the page — the "one more game" and
 * tip buttons.
 *
 * Returns `requiresAction` when the issuer wants 3-D Secure: an off-session
 * charge cannot answer that challenge, so the caller has to send the customer
 * through hosted checkout instead of pretending it worked.
 */
export async function chargeDefaultCard(input: QuickChargeInput): Promise<QuickChargeResult> {
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
      idempotencyKey: input.idempotencyKey ?? charge.id,
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

    return { ok: true, chargeId: charge.id };
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
