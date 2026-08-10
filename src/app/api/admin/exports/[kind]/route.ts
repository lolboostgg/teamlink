import { requireAdmin } from "@/lib/admin/access";
import { prisma } from "@/lib/db";

function cell(value: unknown) {
  const raw = String(value ?? "");
  const safe = /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

function csv(rows: unknown[][], filename: string) {
  return new Response(rows.map((row) => row.map(cell).join(",")).join("\r\n"), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${filename}"` } });
}

export async function GET(_: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  await requireAdmin("finance");
  if (kind === "transactions") {
    const rows = await prisma.creditTransaction.findMany({ include: { user: { select: { accountNo: true, name: true, email: true } } }, orderBy: { createdAt: "desc" } });
    return csv([["Date", "Account", "Name", "Email", "Type", "Amount EUR", "Note"], ...rows.map((row) => [row.createdAt.toISOString(), `#${row.user.accountNo}`, row.user.name, row.user.email, row.type, (row.amountCents / 100).toFixed(2), row.note])], "qup-transactions.csv");
  }
  if (kind === "payouts") {
    const rows = await prisma.payoutRequest.findMany({ include: { teammate: { select: { teammateNo: true, name: true } } }, orderBy: { createdAt: "desc" } });
    return csv([["Date", "Payout", "Teammate", "Status", "Gross EUR", "Fee EUR", "Net EUR", "Admin note"], ...rows.map((row) => [row.createdAt.toISOString(), `#${row.requestNo}`, `${row.teammate.name} (#${row.teammate.teammateNo})`, row.status, row.grossEUR ?? row.amountEUR, row.feeEUR, row.netEUR, row.adminNote])], "qup-payouts.csv");
  }
  if (kind === "revenue") {
    const rows = await prisma.charge.findMany({ include: { savedCard: { select: { brand: true } }, order: { select: { orderNo: true, ignRegion: true, gameName: true } } }, orderBy: { createdAt: "desc" } });
    return csv([["Date", "Order", "Game", "Region", "Payment method", "Kind", "Status", "Gross EUR", "Estimated Stripe fee", "Estimated net"], ...rows.map((row) => { const gross = Number(row.amountEUR); const fee = row.status === "SUCCEEDED" ? Math.round((gross * 0.015 + 0.25) * 100) / 100 : 0; return [row.createdAt.toISOString(), row.order ? `#${row.order.orderNo}` : "", row.order?.gameName, row.order?.ignRegion, row.savedCard?.brand || "Stripe Checkout", row.kind, row.status, gross.toFixed(2), fee.toFixed(2), (gross - fee).toFixed(2)]; })], "qup-revenue.csv");
  }
  return new Response("Unknown export", { status: 404 });
}
