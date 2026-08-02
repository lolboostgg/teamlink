import type { Metadata } from "next";
import { SessionScreen } from "@/components/dashboard/client/SessionScreen";

export const metadata: Metadata = { title: "Your session" };

interface Props {
  params: Promise<{ orderId: string }>;
}

export default async function ClientSessionPage({ params }: Props) {
  const { orderId } = await params;

  // Keyed so a "keep playing" replay (new order id, same route template)
  // mounts fresh instead of reusing the previous order's chat/rating state.
  return <SessionScreen key={orderId} orderId={orderId} />;
}
