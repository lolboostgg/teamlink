import type { CSSProperties } from "react";
import { PriceTag } from "@/components/currency/PriceTag";

interface Props {
  icon: string;
  label: string;
  value: number | string;
  deltaPct?: number;
  /** Treat `value` as a EUR amount and render via PriceTag. */
  currency?: boolean;
  /** One of the curated --hue-* CSS custom properties from globals.css. */
  color?: string;
  /** Keep long text values compact and on a single line. */
  compactValue?: boolean;
}

export function StatCard({ icon, label, value, deltaPct, currency, color, compactValue = false }: Props) {
  const style = color ? ({ "--item-color": color } as CSSProperties) : undefined;

  return (
    <div className={`stat-card${compactValue ? " stat-card--compact-value" : ""}`} style={style}>
      <div className="stat-card__icon">
        <i className={icon} aria-hidden="true" />
      </div>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">
        {currency && typeof value === "number" ? <PriceTag amountEUR={value} /> : value}
      </div>
      {deltaPct !== undefined && (
        <div className={`stat-card__delta${deltaPct >= 0 ? " is-positive" : " is-negative"}`}>
          <i className={`fa-solid ${deltaPct >= 0 ? "fa-arrow-up" : "fa-arrow-down"}`} aria-hidden="true" />
          {Math.abs(deltaPct)}%
        </div>
      )}
    </div>
  );
}
