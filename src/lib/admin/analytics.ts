import { prisma } from "@/lib/db";
import type { OrderStatus } from "@/generated/prisma/client";

/**
 * The numbers an admin opens the dashboard to find out.
 *
 * The overview answered "how much have we ever done" — GMV, orders,
 * completed sessions, all since the beginning. That is a fact about the past
 * and it moves so slowly that it is the same number every morning. It cannot
 * answer the question anybody actually has, which is whether today is going
 * better or worse than the day before it.
 *
 * So everything here is measured over a window, and every window comes back
 * with the one immediately before it for comparison. A number without its
 * previous value is a number you cannot act on.
 */

export interface Period {
  from: Date;
  to: Date;
}

export interface Metric {
  value: number;
  /** The same measure over the window immediately before this one. */
  previous: number;
  /** Percentage change, or null when the previous window was empty — a jump
   *  from nothing is not a percentage, and printing one is how a dashboard
   *  starts showing "+∞%". */
  changePct: number | null;
}

export interface AnalyticsSnapshot {
  period: Period;
  revenue: Metric;
  orders: Metric;
  completed: Metric;
  newCustomers: Metric;
  /** Completed as a share of everything that reached a terminal state. */
  completionRate: Metric;
  /** Money that came back, over the same window. */
  refunded: Metric;
  averageOrderEUR: Metric;
  /** Revenue per day across the window, for the chart. */
  daily: { date: string; revenue: number; orders: number }[];
  topGames: { gameSlug: string; gameName: string; orders: number; revenue: number }[];
  topTeammates: { id: string; name: string; sessions: number; earnedEUR: number }[];
  /** Totals since the beginning, for the "of all time" line under each tile. */
  allTime: { revenue: number; orders: number; completed: number; customers: number };
}

function metric(value: number, previous: number): Metric {
  return {
    value,
    previous,
    changePct: previous === 0 ? null : Math.round(((value - previous) / previous) * 1000) / 10,
  };
}

/** Statuses that represent money we actually earned. */
const EARNED: OrderStatus[] = ["ASSIGNED", "IN_PROGRESS", "COMPLETED"];
const TERMINAL: OrderStatus[] = ["COMPLETED", "CANCELLED", "NO_MATCH"];
const FAILED: OrderStatus[] = ["CANCELLED", "NO_MATCH"];

export async function getAnalytics(period: Period): Promise<AnalyticsSnapshot> {
  const span = period.to.getTime() - period.from.getTime();
  // The window immediately before this one, of the same length — comparing a
  // week against a month would make every figure look like a collapse.
  const prev: Period = { from: new Date(period.from.getTime() - span), to: period.from };

  const inWindow = (p: Period) => ({ createdAt: { gte: p.from, lte: p.to } });

  const [
    revenueNow,
    revenuePrev,
    ordersNow,
    ordersPrev,
    completedNow,
    completedPrev,
    terminalNow,
    terminalPrev,
    customersNow,
    customersPrev,
    refundedNow,
    refundedPrev,
    rows,
    gameRows,
    earningRows,
    allTimeRevenue,
    allTimeOrders,
    allTimeCompleted,
    allTimeCustomers,
  ] = await Promise.all([
    prisma.order.aggregate({ where: { ...inWindow(period), status: { in: EARNED } }, _sum: { priceEUR: true } }),
    prisma.order.aggregate({ where: { ...inWindow(prev), status: { in: EARNED } }, _sum: { priceEUR: true } }),
    prisma.order.count({ where: inWindow(period) }),
    prisma.order.count({ where: inWindow(prev) }),
    prisma.order.count({ where: { ...inWindow(period), status: "COMPLETED" } }),
    prisma.order.count({ where: { ...inWindow(prev), status: "COMPLETED" } }),
    prisma.order.count({ where: { ...inWindow(period), status: { in: TERMINAL } } }),
    prisma.order.count({ where: { ...inWindow(prev), status: { in: TERMINAL } } }),
    prisma.user.count({ where: inWindow(period) }),
    prisma.user.count({ where: inWindow(prev) }),
    prisma.order.aggregate({
      where: { ...inWindow(period), status: { in: FAILED } },
      _sum: { priceEUR: true },
    }),
    prisma.order.aggregate({
      where: { ...inWindow(prev), status: { in: FAILED } },
      _sum: { priceEUR: true },
    }),
    // The daily series. Read as rows rather than grouped in SQL because the
    // window is bounded and the buckets have to include the days with nothing
    // in them — a chart that skips empty days lies about the shape.
    prisma.order.findMany({
      where: inWindow(period),
      select: { createdAt: true, priceEUR: true, status: true },
      orderBy: { createdAt: "asc" },
      take: 5000,
    }),
    prisma.order.groupBy({
      by: ["gameSlug", "gameName"],
      where: { ...inWindow(period), status: { in: EARNED } },
      _count: { _all: true },
      _sum: { priceEUR: true },
      orderBy: { _sum: { priceEUR: "desc" } },
    }),
    prisma.teammateEarning.groupBy({
      by: ["teammateId"],
      where: inWindow(period),
      _count: { _all: true },
      _sum: { amountEUR: true },
    }),
    prisma.order.aggregate({ where: { status: { in: EARNED } }, _sum: { priceEUR: true } }),
    prisma.order.count(),
    prisma.order.count({ where: { status: "COMPLETED" } }),
    prisma.user.count(),
  ]);

  const revenue = Number(revenueNow._sum?.priceEUR ?? 0);
  const revenuePrevious = Number(revenuePrev._sum?.priceEUR ?? 0);

  // One bucket per day across the whole window, zeros included.
  const buckets = new Map<string, { revenue: number; orders: number }>();
  for (let day = new Date(period.from); day <= period.to; day.setDate(day.getDate() + 1)) {
    buckets.set(day.toISOString().slice(0, 10), { revenue: 0, orders: 0 });
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (!bucket) continue;
    bucket.orders += 1;
    if (EARNED.includes(row.status)) bucket.revenue += Number(row.priceEUR);
  }

  const teammateNames = earningRows.length
    ? await prisma.teammate.findMany({
        where: { id: { in: earningRows.map((row) => row.teammateId) } },
        select: { id: true, name: true },
      })
    : [];
  const nameById = new Map(teammateNames.map((t) => [t.id, t.name]));

  return {
    period,
    revenue: metric(revenue, revenuePrevious),
    orders: metric(ordersNow, ordersPrev),
    completed: metric(completedNow, completedPrev),
    newCustomers: metric(customersNow, customersPrev),
    completionRate: metric(
      terminalNow === 0 ? 0 : Math.round((completedNow / terminalNow) * 1000) / 10,
      terminalPrev === 0 ? 0 : Math.round((completedPrev / terminalPrev) * 1000) / 10,
    ),
    refunded: metric(Number(refundedNow._sum?.priceEUR ?? 0), Number(refundedPrev._sum?.priceEUR ?? 0)),
    averageOrderEUR: metric(
      ordersNow === 0 ? 0 : Math.round((revenue / ordersNow) * 100) / 100,
      ordersPrev === 0 ? 0 : Math.round((revenuePrevious / ordersPrev) * 100) / 100,
    ),
    daily: Array.from(buckets, ([date, value]) => ({ date, ...value })),
    topGames: gameRows
      .map((row) => ({
        gameSlug: row.gameSlug,
        gameName: row.gameName,
        orders: typeof row._count === "object" ? (row._count._all ?? 0) : 0,
        revenue: Number(row._sum?.priceEUR ?? 0),
      }))
      .slice(0, 6),
    topTeammates: earningRows
      .map((row) => ({
        id: row.teammateId,
        name: nameById.get(row.teammateId) ?? "Unknown",
        sessions: typeof row._count === "object" ? (row._count._all ?? 0) : 0,
        earnedEUR: Number(row._sum?.amountEUR ?? 0),
      }))
      .sort((a, b) => b.earnedEUR - a.earnedEUR)
      .slice(0, 6),
    allTime: {
      revenue: Number(allTimeRevenue._sum?.priceEUR ?? 0),
      orders: allTimeOrders,
      completed: allTimeCompleted,
      customers: allTimeCustomers,
    },
  };
}

export const PRESET_DAYS: Record<string, number> = { "1d": 1, "7d": 7, "30d": 30, "90d": 90, "365d": 365 };
const DEFAULT_PRESET = "7d";

/** Local midnight, so a day on the chart is a day the team recognises. */
function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseDate(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Turns the query string into a window.
 *
 * Lives here rather than in the page because it reads the clock, and a lint
 * rule the app takes seriously forbids that during render — for good reasons
 * in a client component, and this keeps server components honest to the same
 * rule rather than carving out an exception.
 */
export function resolvePeriod(params: { preset?: string; from?: string; to?: string }): {
  period: Period;
  preset: string | null;
} {
  const customFrom = parseDate(params.from);
  const customTo = parseDate(params.to);

  if (customFrom && customTo && customFrom <= customTo) {
    // Inclusive of the end day: somebody picking "to: today" means all of it.
    return { period: { from: customFrom, to: new Date(customTo.getTime() + 86_399_999) }, preset: null };
  }

  const preset = params.preset && PRESET_DAYS[params.preset] ? params.preset : DEFAULT_PRESET;
  const now = new Date();
  return {
    period: { from: startOfDay(new Date(now.getTime() - (PRESET_DAYS[preset] - 1) * 86_400_000)), to: now },
    preset,
  };
}
