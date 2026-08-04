import { prisma } from "@/lib/db";

/**
 * In-app notifications. Every platform event that someone should hear about
 * writes rows here; the bell polls them. One row per recipient, so read
 * state belongs to the person, not the event.
 */
export interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  href?: string;
}

export async function notifyUser(userId: string, input: NotifyInput) {
  return prisma.notification.create({
    data: { userId, type: input.type, title: input.title, body: input.body, href: input.href },
  });
}

/** Fans an event out to every admin — used for things like a new ID check. */
export async function notifyAdmins(input: NotifyInput) {
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } });
  if (admins.length === 0) return;

  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      type: input.type,
      title: input.title,
      body: input.body,
      href: input.href,
    })),
  });
}

export async function listNotifications(userId: string, take = 30) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function markAllRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markNotificationRead(userId: string, notificationId: string) {
  return prisma.notification.updateMany({ where: { id: notificationId, userId }, data: { readAt: new Date() } });
}
