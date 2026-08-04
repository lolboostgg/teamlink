import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { requireOnboardedTeammate } from "@/lib/teammateGate";
import { loadTeammateEarnings } from "@/lib/teammateEarnings";
import { EarningsLedger } from "@/components/dashboard/teammate/EarningsLedger";
import { StatGrid } from "@/components/dashboard/StatGrid";
import { StatCard } from "@/components/dashboard/StatCard";
import { PriceTag } from "@/components/currency/PriceTag";
import { describePayoutMethod, PAYOUT_LABELS, type PayoutMethodType } from "@/lib/payoutMethods";
import { TEAMMATE_PAYOUT_RATE } from "@/lib/payoutSplit";
import { PayoutRequestPanel, type PayoutMethodOption } from "@/components/dashboard/teammate/PayoutRequestPanel";
import type { PayoutRequestStatus, PayoutRequestView } from "@/lib/payouts";

export const metadata: Metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function TeammatePaymentsPage() {
  await requireOnboardedTeammate();

  const session = await auth();
  const teammate = session?.user?.id
    ? await prisma.teammate.findUnique({
        where: { userId: session.user.id },
        select: {
          id: true,
          payoutMethods: { orderBy: { createdAt: "asc" } },
          verification: { select: { status: true } },
          payoutRequests: {
            orderBy: { createdAt: "desc" },
            take: 20,
            include: { payoutMethod: true },
          },
        },
      })
    : null;

  if (!teammate) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Payments</div>
            <div className="dashboard-panel__sub">No teammate profile is linked to this account yet.</div>
          </div>
        </div>
      </div>
    );
  }

  const earnings = await loadTeammateEarnings(teammate.id);

  const methodOptions: PayoutMethodOption[] = teammate.payoutMethods.map((method) => ({
    id: method.id,
    type: method.type as PayoutMethodType,
    summary: describePayoutMethod(method.type as PayoutMethodType, (method.details as Record<string, string> | null) ?? {}),
    isDefault: method.isDefault,
  }));

  const requests: PayoutRequestView[] = teammate.payoutRequests.map((request) => ({
    id: request.id,
    requestNo: request.requestNo,
    status: request.status as PayoutRequestStatus,
    amountEUR: request.amountEUR === null ? null : Number(request.amountEUR),
    feePercent: Number(request.feePercent),
    note: request.note,
    adminNote: request.adminNote,
    grossEUR: request.grossEUR === null ? null : Number(request.grossEUR),
    feeEUR: request.feeEUR === null ? null : Number(request.feeEUR),
    netEUR: request.netEUR === null ? null : Number(request.netEUR),
    methodType: request.payoutMethod.type as PayoutMethodType,
    methodSummary: describePayoutMethod(
      request.payoutMethod.type as PayoutMethodType,
      (request.payoutMethod.details as Record<string, string> | null) ?? {},
    ),
    createdAt: request.createdAt.getTime(),
    processedAt: request.processedAt?.getTime() ?? null,
  }));
  const defaultMethod = teammate.payoutMethods.find((method) => method.isDefault) ?? teammate.payoutMethods[0] ?? null;
  const verified = teammate.verification?.status === "APPROVED";

  return (
    <>
      <StatGrid>
        <StatCard icon="fa-solid fa-wallet" label="Available balance" value={earnings.balanceEUR} currency color="var(--hue-green)" />
        <StatCard icon="fa-solid fa-hourglass-half" label="Pending payout" value={earnings.pendingEUR} currency color="var(--hue-gold)" />
        <StatCard icon="fa-solid fa-sack-dollar" label="Earned all time" value={earnings.earnedEUR} currency color="var(--accent)" />
        <StatCard icon="fa-solid fa-arrow-up-from-bracket" label="Paid out" value={earnings.paidOutEUR} currency color="var(--hue-purple)" />
      </StatGrid>

      {(!verified || !defaultMethod) && (
        <div className="verification-banner verification-banner--warning">
          <span className="verification-banner__icon">
            <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
          </span>
          <div className="verification-banner__copy">
            <strong>{!verified ? "Your balance can't be released yet" : "No payout method on file"}</strong>
            <span>
              {!verified
                ? "Earnings keep accruing, but a payout needs a completed identity verification."
                : "Add a bank account or wallet so there's somewhere to send your balance."}
            </span>
          </div>
          <Link href="/dashboard/teammate/verification" className="btn btn--vivid btn--sm">
            {!verified ? "Verify identity" : "Add payout method"}
          </Link>
        </div>
      )}

      <PayoutRequestPanel
        balanceEUR={earnings.balanceEUR}
        methods={methodOptions}
        requests={requests}
        verified={verified}
      />

      <div className="payments-split">
        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Earnings history</div>
              <div className="dashboard-panel__sub">
                Every session credits {Math.round(TEAMMATE_PAYOUT_RATE * 100)}% of the order price the moment it
                completes. Multi-teammate orders split that share.
              </div>
            </div>
          </div>
          <EarningsLedger
            rows={earnings.rows}
            emptyHint="Nothing booked yet — your first completed session shows up here."
          />
        </div>

        <div className="dashboard-panel">
          <div className="dashboard-panel__head">
            <div>
              <div className="dashboard-panel__title">Where it goes</div>
              <div className="dashboard-panel__sub">Your default payout method</div>
            </div>
            <Link href="/dashboard/teammate/verification" className="btn btn--ghost btn--sm">
              Manage
            </Link>
          </div>

          {defaultMethod ? (
            <article className="payout-method-card is-default">
              <span className="payout-method-card__icon">
                <i
                  className={defaultMethod.type === "BANK" ? "fa-solid fa-building-columns" : "fa-brands fa-bitcoin"}
                  aria-hidden="true"
                />
              </span>
              <div className="payout-method-card__details">
                <span>{PAYOUT_LABELS[defaultMethod.type as PayoutMethodType]}</span>
                <strong>
                  {describePayoutMethod(
                    defaultMethod.type as PayoutMethodType,
                    (defaultMethod.details as Record<string, string> | null) ?? {},
                  )}
                </strong>
              </div>
              <span className="dashboard-pill dashboard-pill--success">
                <i className="fa-solid fa-star" aria-hidden="true" /> Default
              </span>
            </article>
          ) : (
            <div className="dashboard-empty dashboard-empty--compact">
              <i className="fa-solid fa-wallet" aria-hidden="true" />
              <p>No payout method saved yet.</p>
            </div>
          )}

          <dl className="payments-facts">
            <div>
              <dt>Your share</dt>
              <dd>{Math.round(TEAMMATE_PAYOUT_RATE * 100)}% of every order</dd>
            </div>
            <div>
              <dt>Identity</dt>
              <dd>{verified ? "Verified" : "Not verified yet"}</dd>
            </div>
            <div>
              <dt>Next payout</dt>
              <dd>
                {earnings.balanceEUR > 0 ? <PriceTag amountEUR={earnings.balanceEUR} /> : "Nothing due"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </>
  );
}
