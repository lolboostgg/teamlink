import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * The dispatch log.
 *
 * Candidate rows only ever hold their final state, and a teammate the filters
 * excluded leaves no row at all — so after the fact there is no way to answer
 * "why did this order never reach Kevin?". This writes that history down as
 * it happens, from inside the same transaction as the change it describes.
 *
 * Entries are for humans reading the admin timeline. Nothing in the
 * dispatcher ever reads them back, which is what lets the type be a plain
 * string: a new kind of entry costs nothing.
 */
export const DISPATCH_EVENT = {
  CREATED: "created",
  POOL: "pool",
  WAVE: "wave",
  DELIVERED: "delivered",
  ACCEPTED: "accepted",
  DECLINED: "declined",
  TIMED_OUT: "timed_out",
  SUPERSEDED: "superseded",
  EXHAUSTED: "exhausted",
  SELECTION: "selection",
  ASSIGNED: "assigned",
  ADMIN: "admin",
  ENDED: "ended",
} as const;

export type DispatchEventType = (typeof DISPATCH_EVENT)[keyof typeof DISPATCH_EVENT];

type Client = Prisma.TransactionClient | typeof prisma;

export async function logDispatch(
  client: Client,
  orderId: string,
  type: DispatchEventType,
  message: string,
  extra?: { teammateId?: string | null; detail?: Prisma.InputJsonValue },
): Promise<void> {
  try {
    await client.dispatchEvent.create({
      data: {
        orderId,
        type,
        message,
        teammateId: extra?.teammateId ?? null,
        detail: extra?.detail,
      },
    });
  } catch (err) {
    // A log that can take an order down with it is worse than a gap in the
    // log. This is deliberately the one place in the dispatcher that
    // swallows — note that inside a transaction the caller's work still
    // rolls back or commits on its own merits.
    console.error("[dispatch] log write failed:", orderId, type, err);
  }
}

/** Newest last, which is how a timeline reads. */
export async function readDispatchLog(orderId: string, take = 200) {
  return prisma.dispatchEvent.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
    take,
  });
}
