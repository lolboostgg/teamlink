"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { enforceRateLimit } from "@/lib/admin/rateLimit";

export async function openDispute(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Sign in first.");
  await enforceRateLimit(`dispute:${session.user.id}`, 5, 60 * 60 * 1000);
  const orderId = String(formData.get("orderId") ?? "");
  const title = String(formData.get("title") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 3000);
  if (!orderId || !title || description.length < 10) throw new Error("Choose an order and describe the problem.");

  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { clientUserId: true, candidates: { where: { selected: true }, select: { teammate: { select: { userId: true } } } } } });
  if (!order) throw new Error("Order not found.");
  const ownsOrder = order.clientUserId === session.user.id || order.candidates.some((candidate) => candidate.teammate.userId === session.user.id);
  if (!ownsOrder && session.user.role !== "ADMIN") throw new Error("Forbidden");

  await prisma.dispute.create({ data: { orderId, openedById: session.user.id, openedByRole: session.user.role as "CLIENT" | "TEAMMATE" | "ADMIN", title, description } });
  revalidatePath("/dashboard/admin/disputes");
  revalidatePath(`/dashboard/${session.user.role.toLowerCase()}/disputes`);
}
