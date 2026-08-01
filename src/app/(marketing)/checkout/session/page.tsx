import type { Metadata } from "next";
import { CheckoutSessionMeter } from "@/components/checkout/CheckoutSessionMeter";

export const metadata: Metadata = { title: "Session in progress" };

interface Props {
  searchParams: Promise<{ game?: string; option?: string; rate?: string }>;
}

export default async function CheckoutSessionPage({ searchParams }: Props) {
  const params = await searchParams;
  const gameName = params.game ?? "Your session";
  const option = params.option ?? "Duo";
  const rate = Number(params.rate ?? 0.5);

  return (
    <main className="checkout-page">
      <div className="container">
        <CheckoutSessionMeter gameName={gameName} option={option} ratePerMinuteEUR={rate} />
      </div>
    </main>
  );
}
