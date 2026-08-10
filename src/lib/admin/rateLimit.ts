import "server-only";

import { prisma } from "@/lib/db";

export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const existing = await prisma.rateLimitBucket.findUnique({ where: { key } });
  if (!existing || existing.resetAt <= now) {
    await prisma.rateLimitBucket.upsert({
      where: { key },
      create: { key, count: 1, resetAt: new Date(now.getTime() + windowMs) },
      update: { count: 1, resetAt: new Date(now.getTime() + windowMs) },
    });
    return;
  }
  if (existing.count >= limit) throw new Error("Too many attempts. Try again later.");
  await prisma.rateLimitBucket.update({ where: { key }, data: { count: { increment: 1 } } });
}
