import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { WalletScreen } from "@/components/dashboard/client/WalletScreen";

export const metadata: Metadata = { title: "Wallet" };
// Direct top-level Prisma query in a Server Component — same build-time-
// probe hazard as the other dashboard pages, see lib/db.ts.
export const dynamic = "force-dynamic";

export default async function ClientWalletPage() {
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

  const [user, transactions] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { creditBalanceCents: true } }),
    prisma.creditTransaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  // The ledger is the source of truth; the bonus total is what the balance
  // owes to package bonuses rather than money actually paid in.
  const bonusCents = transactions.filter((t) => t.type === "BONUS").reduce((sum, t) => sum + t.amountCents, 0);

  return (
    <WalletScreen
      balanceCents={user?.creditBalanceCents ?? 0}
      bonusCents={bonusCents}
      transactions={transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amountCents: t.amountCents,
        note: t.note,
        createdAt: t.createdAt.getTime(),
      }))}
    />
  );
}
