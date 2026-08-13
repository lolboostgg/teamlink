import { timingSafeEqual } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

function tokenMatches(given: string | null | undefined, expected: string | null): boolean {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Authorizes a customer-side action. Account orders require their owner;
 * guest orders require the unguessable token from the public order URL.
 *
 * `viewerId` lets a caller that has already resolved the session hand it in.
 * auth() decodes and verifies the JWT every time it is called, and the role
 * re-check behind it can reach the database — the caching there is keyed on a
 * field the token only persists between requests, so three calls inside one
 * request are three decodes and up to three queries, not one and two cache
 * hits. Passing null is not the same as omitting it: null means "resolved,
 * and there is nobody signed in". */
export async function authorizeCustomerOrder(orderId: string, accessToken?: string | null, viewerId?: string | null) {
  const session = viewerId === undefined ? await auth() : { user: { id: viewerId ?? undefined } };
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  if (order.clientUserId) return order.clientUserId === session?.user?.id ? order : null;
  return tokenMatches(accessToken, order.accessToken) ? order : null;
}
