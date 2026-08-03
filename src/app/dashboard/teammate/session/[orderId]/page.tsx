import type { Metadata } from "next";
import Link from "next/link";
import { OrderRoom } from "@/components/dashboard/teammate/OrderRoom";

export const metadata: Metadata = { title: "Order Room" };

interface Props {
  params: Promise<{ orderId: string }>;
}

// The order itself lives in the browser-side dispatch store (see
// lib/matchmaking/store.ts), so this page only resolves the id and hands
// off — nothing to fetch server-side yet.
export default async function TeammateOrderRoomPage({ params }: Props) {
  const { orderId } = await params;

  return (
    <>
      <Link href="/dashboard/teammate" className="account-back">
        <i className="fa-solid fa-arrow-left" aria-hidden="true" /> Back to dashboard
      </Link>
      <OrderRoom orderId={orderId} />
    </>
  );
}
