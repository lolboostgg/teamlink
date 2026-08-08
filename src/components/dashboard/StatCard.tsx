import type { CSSProperties } from "react";
import Link from "next/link";
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
  /**
   * Renders a placeholder bar instead of the value. Without this the stats
   * that are computed in the browser paint a hard "0" for the first frame
   * and then snap to the real number.
   */
  loading?: boolean;
  /** Turns the whole tile into a link — for a stat whose natural next step is
   * a page (an inbox count, say, rather than a balance). */
  href?: string;
}

export function StatCard({
  icon,
  label,
  value,
  deltaPct,
  currency,
  color,
  compactValue = false,
  loading = false,
  href,
}: Props) {
  const style = color ? ({ "--item-color": color } as CSSProperties) : undefined;
  const Tag = href ? Link : "div";

  return (
    <Tag
      // Only Link accepts href, and only when there is one — spreading keeps
      // the plain <div> case free of a stray attribute.
      {...(href ? { href } : {})}
      className={`stat-card${compactValue ? " stat-card--compact-value" : ""}${href ? " stat-card--link" : ""}`}
      style={style}
    >
      <div className="stat-card__icon">
        <i className={icon} aria-hidden="true" />
      </div>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">
        {loading ? (
          <span className="stat-card__skeleton" aria-label="Loading" />
        ) : currency && typeof value === "number" ? (
          <PriceTag amountEUR={value} />
        ) : (
          value
        )}
      </div>
      {deltaPct !== undefined && (
        <div className={`stat-card__delta${deltaPct >= 0 ? " is-positive" : " is-negative"}`}>
          <i className={`fa-solid ${deltaPct >= 0 ? "fa-arrow-up" : "fa-arrow-down"}`} aria-hidden="true" />
          {Math.abs(deltaPct)}%
        </div>
      )}
    </Tag>
  );
}
