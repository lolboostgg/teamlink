import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { ReviewsBoard } from "@/components/dashboard/teammate/ReviewsBoard";
import { requireOnboardedTeammate } from "@/lib/teammateGate";
import { TablePagination, paginate } from "@/components/dashboard/TablePagination";

export const metadata: Metadata = { title: "Reviews" };

const PAGE_SIZE = 50;

export default async function TeammateReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireOnboardedTeammate();
  const params = await searchParams;
  const session = await auth();
  const teammate = session?.user?.id
    ? await prisma.teammate.findUnique({ where: { userId: session.user.id } })
    : null;

  // A teammate with a few hundred sessions was loading every review they had
  // ever been given, on a page that shows the most recent ones.
  const total = teammate ? await prisma.review.count({ where: { teammateId: teammate.id } }) : 0;
  const { page, pageCount, skip, take } = paginate(params.page, total, PAGE_SIZE);

  const reviews = teammate
    ? await prisma.review.findMany({
        where: { teammateId: teammate.id },
        include: { order: true, clientUser: true },
        orderBy: { createdAt: "desc" },
        skip,
        take,
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
          <div className="dashboard-panel__title">
            <i className="fa-solid fa-star" aria-hidden="true" /> Reviews
          </div>
          <div className="dashboard-panel__sub">
            What clients are saying. Tap a row of the spread to see only those.
          </div>
        </div>
      </div>
      {display.length > 0 ? (
        <ReviewsBoard reviews={display} />
      ) : (
        <div className="dashboard-empty">
          <i className="fa-solid fa-star-half-stroke" aria-hidden="true" />
          <p>No reviews yet.</p>
        </div>
      )}

      <TablePagination
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={PAGE_SIZE}
        hrefFor={(nextPage) => `/dashboard/teammate/reviews?page=${nextPage}`}
        label="Reviews pagination"
      />
    </div>
  );
}
