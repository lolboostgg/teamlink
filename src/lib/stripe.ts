import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * A thin Stripe client over their REST API.
 *
 * Deliberately not the `stripe` npm package: this project pins Node 18 in the
 * dev environment, and adding a dependency that can neither be installed nor
 * type-checked here would be untested code in the money path. The REST API is
 * versioned and stable, and the handful of calls below are all this needs.
 *
 * Amounts are always sent in cents, and always in EUR — the currency switcher
 * is a display convenience, never what gets charged.
 */

const API = "https://api.stripe.com/v1";

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set.");
  return key;
}

/** Stripe takes form encoding with bracket notation for nested values. */
function encode(value: unknown, prefix = "", out: string[] = []): string[] {
  if (value === undefined || value === null) return out;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => encode(entry, `${prefix}[${index}]`, out));
    return out;
  }
  if (typeof value === "object") {
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      encode(inner, prefix ? `${prefix}[${key}]` : key, out);
    }
    return out;
  }
  out.push(`${encodeURIComponent(prefix)}=${encodeURIComponent(String(value))}`);
  return out;
}

export class StripeError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, body?: Record<string, unknown>, idempotencyKey?: string): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      // Pinned so a Stripe API upgrade cannot silently change a response
      // shape this code depends on.
      "Stripe-Version": "2024-06-20",
      // Makes a retried request — a double-clicked button, a redelivered
      // webhook — reuse the first result instead of charging twice.
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: body ? encode(body).join("&") : undefined,
    cache: "no-store",
  });

  const data = (await response.json()) as { error?: { message?: string; code?: string } } & T;
  if (!response.ok) {
    throw new StripeError(data.error?.message ?? `Stripe request failed (${response.status})`, data.error?.code);
  }
  return data;
}

export interface StripeCustomer {
  id: string;
}

export async function createCustomer(input: { email: string; name?: string | null; userId?: string }) {
  return call<StripeCustomer>("/customers", {
    email: input.email,
    ...(input.name ? { name: input.name } : {}),
    ...(input.userId ? { metadata: { userId: input.userId } } : {}),
  });
}

export interface StripeCheckoutSession {
  id: string;
  url: string | null;
  payment_intent: string | null;
  customer: string | null;
  status: string;
  payment_status: string;
  customer_details?: { email?: string | null };
  metadata?: Record<string, string>;
}

/**
 * Hosted checkout for the first payment.
 *
 * `setup_future_usage: off_session` is what makes "play one more game" work
 * later without asking for the card again — Stripe keeps the payment method
 * on the customer, and we store only its id.
 */
export async function createCheckoutSession(input: {
  amountEUR: number;
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  customerEmail?: string;
  saveCard: boolean;
  /**
   * Which methods the hosted page offers. PayPal runs through Stripe too, so
   * it is a real payment here rather than a second integration — but it
   * cannot be charged off-session later, so it never asks to save anything.
   */
  methods?: ("card" | "paypal")[];
  metadata: Record<string, string>;
  idempotencyKey?: string;
}) {
  // Saving a payment method for later only works for cards; asking Stripe to
  // store a PayPal agreement here would fail the whole session.
  const methods = input.methods?.length ? input.methods : ["card"];
  const saveCard = input.saveCard && methods.length === 1 && methods[0] === "card";
  return call<StripeCheckoutSession>(
    "/checkout/sessions",
    {
      mode: "payment",
      payment_method_types: methods,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      ...(input.customerId ? { customer: input.customerId } : {}),
      ...(!input.customerId && input.customerEmail ? { customer_email: input.customerEmail } : {}),
      // A guest who pays gets a customer record anyway, so the same card can
      // be charged again within that order without a second checkout.
      ...(!input.customerId ? { customer_creation: "always" } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(input.amountEUR * 100),
            product_data: { name: input.description },
          },
        },
      ],
      // Copied onto the payment intent as well, not just the session. The
      // intent's own succeeded-event is the one most endpoints subscribe to,
      // and without this it arrives carrying nothing that says which order it
      // paid for.
      payment_intent_data: {
        metadata: input.metadata,
        ...(saveCard ? { setup_future_usage: "off_session" } : {}),
      },
      metadata: input.metadata,
    },
    input.idempotencyKey,
  );
}

export async function getCheckoutSession(sessionId: string) {
  return call<StripeCheckoutSession>(`/checkout/sessions/${sessionId}`);
}

export interface StripePaymentMethod {
  id: string;
  card?: { brand: string; last4: string; exp_month: number; exp_year: number };
}

export async function getPaymentIntent(paymentIntentId: string) {
  return call<StripePaymentIntent & { payment_method: string | null }>(`/payment_intents/${paymentIntentId}`);
}

export async function getPaymentMethod(paymentMethodId: string) {
  return call<StripePaymentMethod>(`/payment_methods/${paymentMethodId}`);
}

export async function detachPaymentMethod(paymentMethodId: string) {
  return call<StripePaymentMethod>(`/payment_methods/${paymentMethodId}/detach`, {});
}

export interface StripePaymentIntent {
  id: string;
  status: string;
  client_secret: string | null;
  last_payment_error?: { message?: string };
}

/**
 * Charges a stored card with nobody at the keyboard.
 *
 * `off_session: true` tells Stripe the customer is not present, which changes
 * how the issuer treats it; a card that still demands 3-D Secure comes back
 * as `requires_action` rather than succeeding, and the caller has to send the
 * customer somewhere to confirm.
 */
export async function chargeSavedCard(input: {
  customerId: string;
  paymentMethodId: string;
  amountEUR: number;
  description: string;
  metadata: Record<string, string>;
  idempotencyKey: string;
}) {
  return call<StripePaymentIntent>(
    "/payment_intents",
    {
      amount: Math.round(input.amountEUR * 100),
      currency: "eur",
      customer: input.customerId,
      payment_method: input.paymentMethodId,
      off_session: true,
      confirm: true,
      description: input.description,
      metadata: input.metadata,
    },
    input.idempotencyKey,
  );
}

/**
 * Verifies a webhook came from Stripe.
 *
 * Without this anyone who finds the endpoint could post "payment succeeded"
 * and get a free order. Compared in constant time, and the timestamp is
 * checked so a captured request cannot be replayed indefinitely.
 */
export function verifyWebhook(payload: string, header: string | null, toleranceSeconds = 300): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((piece) => {
      const [key, ...rest] = piece.split("=");
      return [key.trim(), rest.join("=")];
    }),
  );
  const timestamp = Number(parts.t);
  const signature = parts.v1;
  if (!Number.isFinite(timestamp) || !signature) return false;
  if (Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
