import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Order Confirmed",
};

export default function CheckoutSuccessPage() {
  return (
    <main className="section">
      <div className="container" style={{ textAlign: "center", maxWidth: 480, margin: "0 auto" }}>
        <span className="why-card__icon" style={{ margin: "0 auto 20px" }}>
          <i className="fa-solid fa-check" aria-hidden="true" />
        </span>
        <h1 className="section__title">You&rsquo;re all set!</h1>
        <p className="section__sub" style={{ margin: "0 auto 28px" }}>
          We&rsquo;re matching you with a teammate now. This is a mock confirmation — no real
          payment was processed.
        </p>
        <Link className="btn btn--primary" href="/">
          Back to home
        </Link>
      </div>
    </main>
  );
}
