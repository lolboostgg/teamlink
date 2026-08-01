import type { Metadata } from "next";
import Link from "next/link";
import { getTeammateById } from "@/lib/teammates";

export const metadata: Metadata = {
  title: "Order Confirmed",
};

interface Props {
  searchParams: Promise<{ teammate?: string }>;
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const params = await searchParams;
  const teammate = params.teammate ? getTeammateById(params.teammate) : undefined;

  return (
    <main className="section">
      <div className="container" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
        <span className="why-card__icon" style={{ margin: "0 auto 20px" }}>
          <i className="fa-solid fa-check" aria-hidden="true" />
        </span>
        <h1 className="section__title">You&rsquo;re all set!</h1>
        <p className="section__sub" style={{ margin: "0 auto 28px" }}>
          {teammate
            ? `You're matched with ${teammate.name}. This is a mock confirmation — no real payment was processed.`
            : "We're matching you with a teammate now. This is a mock confirmation — no real payment was processed."}
        </p>
        <Link className="btn btn--primary" href="/">
          Back to home
        </Link>
      </div>
    </main>
  );
}
