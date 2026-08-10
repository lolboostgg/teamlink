import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WalletScreen } from "@/components/dashboard/client/WalletScreen";
import { TablePagination, paginate } from "@/components/dashboard/TablePagination";

export const metadata: Metadata = { title: "Wallet" };
// Direct top-level Prisma query in a Server Component — same build-time-
// probe hazard as the other dashboard pages, see lib/db.ts.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function ClientWalletPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Wallet</div>
            <div className="dashboard-panel__sub">Sign in to see your store credit.</div>
          </div>
        </div>
      </div>
    );
  }

  // 50 was a silent ceiling: a customer with more history simply never saw
  // the rest of it, and nothing on the page said so.
  const total = await prisma.creditTransaction.count({ where: { userId: session.user.id } });
  const { page, pageCount, skip, take } = paginate(params.page, total, PAGE_SIZE);

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { creditBalanceCents: true } }),
    prisma.creditTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  // The ledger is the source of truth; the bonus total is what the balance
  // owes to package bonuses rather than money actually paid in. Aggregated
  // rather than summed from `transactions` — that array is now one page, and
  // summing it would have quietly turned a lifetime figure into a per-page
  // one the moment this was paginated.
  const bonus = await prisma.creditTransaction.aggregate({
    where: { userId: session.user.id, type: "BONUS" },
    _sum: { amountCents: true },
  });

  return (
    <>
    <WalletScreen
      balanceCents={user?.creditBalanceCents ?? 0}
      bonusCents={bonus._sum.amountCents ?? 0}
      transactions={transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amountCents: t.amountCents,
        note: t.note,
        createdAt: t.createdAt.getTime(),
      }))}
    />

    <TablePagination
      page={page}
      pageCount={pageCount}
      total={total}
      pageSize={PAGE_SIZE}
      hrefFor={(nextPage) => `/dashboard/client/wallet?page=${nextPage}`}
      label="Wallet pagination"
    />
    </>
  );
}
