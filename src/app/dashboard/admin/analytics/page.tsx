import type { Metadata } from "next";
import { getAnalytics, resolvePeriod, type Metric } from "@/lib/admin/analytics";
import { AnalyticsRange } from "@/components/dashboard/admin/AnalyticsRange";
import { gameIcon } from "@/lib/gameArt";
import Link from "next/link";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ preset?: string; from?: string; to?: string }> };

const money = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });
const dayLabel = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

function Trend({ metric, unit = "" }: { metric: Metric; unit?: string }) {
  if (metric.changePct === null) {
    return (
      <span className="kpi__trend is-flat">
        no {unit || "data"} in the period before
      </span>
    );
  }
  const up = metric.changePct >= 0;
  return (
    <span className={`kpi__trend${up ? " is-up" : " is-down"}`}>
      <i className={`fa-solid fa-arrow-${up ? "up" : "down"}`} aria-hidden="true" />
      {Math.abs(metric.changePct)}% <span>vs previous period</span>
    </span>
  );
}

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  const params = await searchParams;

  const { period, preset } = resolvePeriod(params);
  const { from, to } = period;

  const stats = await getAnalytics(period);
  const peak = Math.max(...stats.daily.map((day) => day.revenue), 1);

  const kpis = [
    {
      label: "Revenue",
      value: money.format(stats.revenue.value),
      metric: stats.revenue,
      allTime: `${money.format(stats.allTime.revenue)} all time`,
      tone: "var(--hue-green)",
      icon: "fa-solid fa-sack-dollar",
    },
    {
      label: "Orders",
      value: String(stats.orders.value),
      metric: stats.orders,
      allTime: `${stats.allTime.orders} all time`,
      tone: "var(--accent)",
      icon: "fa-solid fa-receipt",
    },
    {
      label: "Sessions completed",
      value: String(stats.completed.value),
      metric: stats.completed,
      allTime: `${stats.allTime.completed} all time`,
      tone: "var(--hue-cyan)",
      icon: "fa-solid fa-circle-check",
    },
    {
      label: "New customers",
      value: String(stats.newCustomers.value),
      metric: stats.newCustomers,
      allTime: `${stats.allTime.customers} accounts all time`,
      tone: "var(--hue-purple)",
      icon: "fa-solid fa-user-plus",
    },
    {
      label: "Completion rate",
      value: `${stats.completionRate.value}%`,
      metric: stats.completionRate,
      allTime: "of orders that reached an end state",
      tone: "var(--hue-gold)",
      icon: "fa-solid fa-flag-checkered",
    },
    {
      label: "Refunded",
      value: money.format(stats.refunded.value),
      metric: stats.refunded,
      allTime: "cancelled and no-match orders",
      tone: "var(--danger)",
      icon: "fa-solid fa-rotate-left",
    },
    {
      label: "Average order",
      value: money.format(stats.averageOrderEUR.value),
      metric: stats.averageOrderEUR,
      allTime: "across every order in the period",
      tone: "var(--hue-pink)",
      icon: "fa-solid fa-scale-balanced",
    },
  ];

  return (
    <>
      <div className="admin-export-row"><Link href="/api/admin/exports/revenue" className="btn btn--ghost btn--sm"><i className="fa-solid fa-file-csv" /> Revenue, fees & net CSV</Link></div>
      <div className="analytics-head">
        <div>
          <h1 className="analytics-head__title">Analytics</h1>
          <p className="analytics-head__sub">
            {dayLabel.format(from)} &ndash; {dayLabel.format(to)} &middot; every figure against the period immediately
            before it
          </p>
        </div>
        <AnalyticsRange
          from={from.toISOString().slice(0, 10)}
          to={to.toISOString().slice(0, 10)}
          preset={preset}
        />
      </div>

      <div className="kpi-grid">
        {kpis.map((kpi) => (
          <article className="kpi" key={kpi.label} style={{ ["--tone" as string]: kpi.tone }}>
            <span className="kpi__icon" aria-hidden="true">
              <i className={kpi.icon} />
            </span>
            <span className="kpi__label">{kpi.label}</span>
            <b className="kpi__value">{kpi.value}</b>
            <Trend metric={kpi.metric} />
            <small className="kpi__all-time">{kpi.allTime}</small>
          </article>
        ))}
      </div>

      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Revenue per day</div>
            <div className="dashboard-panel__sub">
              Every day in the range, including the empty ones &mdash; a chart that skips them lies about the shape.
            </div>
          </div>
        </div>

        {/* Bars, not a line: the series is daily counts of a countable thing,
            and a line between two days implies values in between that do not
            exist. */}
        <div className="chart" role="img" aria-label={`Revenue per day between ${dayLabel.format(from)} and ${dayLabel.format(to)}`}>
          {stats.daily.map((day) => (
            <div className="chart__col" key={day.date} title={`${day.date} · ${money.format(day.revenue)} · ${day.orders} orders`}>
              <span className="chart__bar" style={{ height: `${Math.max(2, (day.revenue / peak) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="chart__axis">
          <span>{dayLabel.format(from)}</span>
          <span>peak {money.format(peak)}</span>
          <span>{dayLabel.format(to)}</span>
        </div>
      </div>

      <div className="analytics-split">
        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Top games</div>
              <div className="dashboard-panel__sub">By revenue in this period</div>
            </div>
          </div>
          {stats.topGames.length === 0 ? (
            <div className="dashboard-empty">
              <i className="fa-solid fa-gamepad" aria-hidden="true" />
              <p>No orders in this period.</p>
            </div>
          ) : (
            <ul className="rank-list">
              {stats.topGames.map((game) => (
                <li key={game.gameSlug}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={gameIcon(game.gameSlug)} alt="" />
                  <span className="rank-list__name">{game.gameName}</span>
                  <span className="rank-list__meta">{game.orders} orders</span>
                  <b>{money.format(game.revenue)}</b>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Top teammates</div>
              <div className="dashboard-panel__sub">By what they earned in this period</div>
            </div>
          </div>
          {stats.topTeammates.length === 0 ? (
            <div className="dashboard-empty">
              <i className="fa-solid fa-user-group" aria-hidden="true" />
              <p>Nobody earned in this period.</p>
            </div>
          ) : (
            <ul className="rank-list">
              {stats.topTeammates.map((teammate) => (
                <li key={teammate.id}>
                  <span className="rank-list__dot" aria-hidden="true" />
                  <span className="rank-list__name">{teammate.name}</span>
                  <span className="rank-list__meta">{teammate.sessions} paid</span>
                  <b>{money.format(teammate.earnedEUR)}</b>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
