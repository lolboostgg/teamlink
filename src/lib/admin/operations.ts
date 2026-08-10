import "server-only";

import { prisma } from "@/lib/db";
import { stripeConfigured } from "@/lib/stripe";

export async function getOperationsSnapshot() {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60_000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60_000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60_000);
  const [unmatched, longSessions, failedRefunds, verifications, overduePayouts, offlineInSession, messages, latestCharge, latestDispatch] = await Promise.all([
    prisma.order.count({ where: { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING"] }, dispatchedAt: { lt: fiveMinutesAgo }, candidates: { none: { selected: true } } } }),
    prisma.order.count({ where: { status: "IN_PROGRESS", sessionStartAt: { lt: threeHoursAgo } } }),
    prisma.notification.count({ where: { type: "order.refund_due", readAt: null } }),
    prisma.teammateVerification.count({ where: { status: "PENDING" } }),
    prisma.payoutRequest.count({ where: { status: "PENDING", createdAt: { lt: sevenDaysAgo } } }),
    prisma.dispatchCandidate.count({ where: { selected: true, order: { status: "IN_PROGRESS" }, teammate: { lastSeenAt: { lt: fiveMinutesAgo } } } }),
    prisma.conversationMessage.findMany({ orderBy: { createdAt: "desc" }, take: 500, select: { conversationKey: true, sender: true, createdAt: true } }),
    prisma.charge.findFirst({ where: { status: { in: ["SUCCEEDED", "AUTHORIZED"] } }, orderBy: { updatedAt: "desc" }, select: { updatedAt: true } }),
    prisma.dispatchEvent.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
  ]);
  const latestByConversation = new Map<string, (typeof messages)[number]>();
  messages.forEach((message) => { if (!latestByConversation.has(message.conversationKey)) latestByConversation.set(message.conversationKey, message); });
  const unansweredChats = [...latestByConversation.values()].filter((message) => message.sender !== "admin" && message.createdAt < new Date(now.getTime() - 10 * 60_000)).length;
  return {
    warnings: [
      { label: "Orders waiting for a teammate", count: unmatched, href: "/dashboard/admin/dispatch", severity: "danger" },
      { label: "Sessions running over 3 hours", count: longSessions, href: "/dashboard/admin/orders", severity: "warning" },
      { label: "Failed refunds", count: failedRefunds, href: "/dashboard/admin/orders", severity: "danger" },
      { label: "Unanswered chats", count: unansweredChats, href: "/dashboard/admin/chat", severity: "warning" },
      { label: "Open verifications", count: verifications, href: "/dashboard/admin/users", severity: "info" },
      { label: "Payouts overdue 7+ days", count: overduePayouts, href: "/dashboard/admin/payouts", severity: "danger" },
      { label: "Offline during a session", count: offlineInSession, href: "/dashboard/admin/dispatch", severity: "danger" },
    ],
    systems: [
      { label: "Stripe", ok: stripeConfigured(), detail: stripeConfigured() ? `Last payment ${latestCharge ? latestCharge.updatedAt.toLocaleString("en-GB") : "not recorded"}` : "Not configured" },
      { label: "Dispatch", ok: Boolean(latestDispatch), detail: latestDispatch ? `Last event ${latestDispatch.createdAt.toLocaleString("en-GB")}` : "No event recorded" },
      { label: "Notification cron", ok: Boolean(process.env.CRON_SECRET), detail: process.env.CRON_SECRET ? "Secret configured" : "CRON_SECRET missing" },
      { label: "Email", ok: Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY), detail: process.env.SMTP_HOST || process.env.RESEND_API_KEY ? "Provider configured" : "Provider missing" },
      { label: "Discord", ok: Boolean(process.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_BOT_TOKEN), detail: process.env.DISCORD_WEBHOOK_URL || process.env.DISCORD_BOT_TOKEN ? "Channel configured" : "Provider missing" },
    ],
  };
}
