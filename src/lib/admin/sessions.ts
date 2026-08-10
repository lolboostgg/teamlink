import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createAdminSession(userId: string, ipAddress?: string | null, userAgent?: string | null) {
  const token = randomUUID();
  await prisma.adminSession.create({ data: { userId, tokenHash: hash(token), ipAddress: ipAddress || null, userAgent: userAgent || null, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000) } });
  return token;
}

export async function adminSessionActive(token: string) {
  const session = await prisma.adminSession.findUnique({ where: { tokenHash: hash(token) }, select: { id: true, revokedAt: true, expiresAt: true, lastSeenAt: true } });
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return false;
  if (Date.now() - session.lastSeenAt.getTime() > 2 * 60_000) void prisma.adminSession.update({ where: { id: session.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  return true;
}
