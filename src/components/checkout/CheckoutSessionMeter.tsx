"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCurrency } from "@/components/currency/CurrencyProvider";
import { useLanguage } from "@/components/language/LanguageProvider";

interface Props {
  gameName: string;
  option: string;
  ratePerMinuteEUR: number;
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

// No backend to actually track a running session or charge PayPal
// continuously — this is a live-ticking illustration of the "connect once,
// keep playing, get billed for what you use" flow, ending in a mock
// receipt. Nothing here is a real charge.
export function CheckoutSessionMeter({ gameName, option, ratePerMinuteEUR }: Props) {
  const { format } = useCurrency();
  const { p } = useLanguage();
  const [seconds, setSeconds] = useState(0);
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    if (ended) return;
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [ended]);

  const costEUR = (seconds / 60) * ratePerMinuteEUR;

  if (ended) {
    return (
      <div className="session-meter session-meter--receipt">
        <div className="session-meter__icon">
          <i className="fa-solid fa-circle-check" aria-hidden="true" />
        </div>
        <h1 className="session-meter__title">{p("Session ended")}</h1>
        <p className="session-meter__sub">
          {p("You played for")} {formatElapsed(seconds)}, {p("charged automatically via PayPal.")}
        </p>
        <div className="session-meter__receipt-total">{format(costEUR)}</div>
        <Link href="/dashboard/client/orders" className="btn btn--vivid">
          {p("View my orders")}
        </Link>
      </div>
    );
  }

  return (
    <div className="session-meter">
      <span className="session-meter__badge">
        <span className="pulse-dot" aria-hidden="true" /> {p("PayPal auto-pay connected")}
      </span>

      <h1 className="session-meter__title">
        {gameName} · {option}
      </h1>
      <p className="session-meter__sub">{p("Keep playing, you're billed automatically for the time you use.")}</p>

      <div className="session-meter__display">
        <div className="session-meter__stat">
          <span className="session-meter__stat-label">{p("Elapsed")}</span>
          <span className="session-meter__stat-value">{formatElapsed(seconds)}</span>
        </div>
        <div className="session-meter__stat">
          <span className="session-meter__stat-label">{p("Running total")}</span>
          <span className="session-meter__stat-value session-meter__stat-value--cost">{format(costEUR)}</span>
        </div>
      </div>

      <p className="session-meter__rate">{format(ratePerMinuteEUR)} {p("/ minute")}</p>

      <button type="button" className="btn btn--vivid" onClick={() => setEnded(true)}>
        {p("End session & charge total")}
      </button>
    </div>
  );
}
