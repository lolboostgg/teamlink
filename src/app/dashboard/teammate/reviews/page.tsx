import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ReviewsList } from "@/components/dashboard/teammate/ReviewsList";
import { requireOnboardedTeammate } from "@/lib/teammateGate";

export const metadata: Metadata = { title: "Reviews" };

export default async function TeammateReviewsPage() {
  await requireOnboardedTeammate();
  const session = await auth();
  const teammate = session?.user?.id
    ? await prisma.teammate.findUnique({ where: { userId: session.user.id } })
    : null;
  const reviews = teammate
    ? await prisma.review.findMany({
        where: { teammateId: teammate.id },
        include: { order: true, clientUser: true },
        orderBy: { createdAt: "desc" },
      })
    : [];
  const display = reviews.map((review) => ({
    id: review.id,
    client: review.clientUser?.name || review.order.customerLabel || "Anonymous",
    gameName: review.order.gameName,
    gameSlug: review.order.gameSlug,
    option: review.order.option,
    orderNo: review.order.orderNo,
    clientAvatarUrl: review.clientUser?.avatarUrl ?? null,
    rating: review.rating,
    date: new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(review.createdAt),
  }));
  return (
    <div className="dashboard-panel">
      <div className="dashboard-panel__head">
        <div>
          <div className="dashboard-panel__title">Recent reviews</div>
          <div className="dashboard-panel__sub">What clients are saying</div>
        </div>
      </div>
      {display.length > 0 ? (
        <ReviewsList reviews={display} />
      ) : (
        <div className="dashboard-empty">
          <i className="fa-solid fa-star-half-stroke" aria-hidden="true" />
          <p>No reviews yet.</p>
        </div>
      )}
    </div>
  );
}
