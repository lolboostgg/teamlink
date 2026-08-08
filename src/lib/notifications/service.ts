import { after } from "next/server";
import { prisma } from "@/lib/db";
import { publish } from "@/lib/events/bus";
import { deliverExternally } from "@/lib/notify/channels";

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
  /** Extra rows for the Discord embed only. The bell and the mail are prose;
   * a chat message is read at a glance and wants the numbers laid out. */
  fields?: { name: string; value: string; inline?: boolean }[];
}

export async function notifyUser(userId: string, input: NotifyInput) {
  const notification = await prisma.notification.create({
    data: { userId, type: input.type, title: input.title, body: input.body, href: input.href },
  });
  // Pushes the bell instead of making it wait out its poll interval.
  await publish({ topic: "notifications", userIds: [userId] });

  // Discord and mail on top, where the event's type calls for it — see the
  // policy table in notify/channels.ts.
  //
  // after() rather than await or a floating promise. Awaiting put an SMTP
  // connection (ten second timeout) and two Discord round trips in front of
  // the user's own click — accepting an order sat there spinning while a
  // mail was negotiated. A floating promise has the opposite problem: once
  // the response is sent the process can be frozen, so the send is never
  // made at all. after() is the one that keeps the work and gives the
  // response back immediately.
  after(() => deliverExternally(userId, input));

  return notification;
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
  await publish({ topic: "notifications", userIds: admins.map((a) => a.id) });

  // Same fan-out as notifyUser, and off the request path for the same
  // reason. Most admin events are bell-only by policy; the ones that are not
  // — a guest refund nobody can pay automatically — must not sit unseen
  // until someone happens to open the dashboard.
  after(() => Promise.allSettled(admins.map((admin) => deliverExternally(admin.id, input))));
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
