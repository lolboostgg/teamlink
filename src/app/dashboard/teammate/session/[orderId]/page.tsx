import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { OrderRoom } from "@/components/dashboard/teammate/OrderRoom";
import { requireOnboardedTeammate } from "@/lib/teammateGate";

export const metadata: Metadata = { title: "Order Room" };

interface Props {
  params: Promise<{ orderId: string }>;
}

export const dynamic = "force-dynamic";

/**
 * The teammate's room for one order.
 *
 * The URL carries the human order number (#1108); the cuid still resolves so
 * links written before the switch — notifications already in the database,
 * bookmarks, anything pasted in Discord — keep opening. Either way the room
 * itself is handed the real id, since that is what every API call it makes is
 * keyed by.
 */
export default async function TeammateOrderRoomPage({ params }: Props) {
  await requireOnboardedTeammate();
  const { orderId } = await params;

  const orderNo = Number(orderId);
  const order = await prisma.order.findUnique({
    where: Number.isInteger(orderNo) && orderNo > 0 ? { orderNo } : { id: orderId },
    select: { id: true },
  });
  if (!order) notFound();

  return (
    <>
      <Link href="/dashboard/teammate" className="account-back">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to dashboard
      </Link>
      <OrderRoom orderId={order.id} />
    </>
  );
}
