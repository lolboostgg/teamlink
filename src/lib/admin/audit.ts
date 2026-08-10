import "server-only";

import { headers } from "next/headers";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
};

function json(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function writeAudit(input: AuditInput) {
  let ipAddress: string | null = null;
  try {
    const requestHeaders = await headers();
    ipAddress = (requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("cf-connecting-ip"))?.split(",")[0].trim() ?? null;
  } catch {}
  await prisma.adminAuditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      reason: input.reason?.trim() || null,
      before: json(input.before),
      after: json(input.after),
      ipAddress,
    },
  });
}
