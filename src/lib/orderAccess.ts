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
 * guest orders require the unguessable token from the public order URL. */
export async function authorizeCustomerOrder(orderId: string, accessToken?: string | null) {
  const session = await auth();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  if (order.clientUserId) return order.clientUserId === session?.user?.id ? order : null;
  return tokenMatches(accessToken, order.accessToken) ? order : null;
}
