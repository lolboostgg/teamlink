import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Teammates by name, for the dispatch board's assign control.
 *
 * Deliberately not filtered by availability or eligibility: this is the
 * override. It exists for "the customer asked for this person in a support
 * chat", which is exactly the case the dispatcher's own filters would refuse.
 * What it does report is whether they are online and whether they are already
 * on something, so an admin overriding the rules can at least see which rule
 * they are overriding.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ teammates: [] });

  const rows = await prisma.teammate.findMany({
    where: { name: { contains: q, mode: "insensitive" } },
    select: {
      id: true,
      name: true,
      rating: true,
      available: true,
      gameSlugs: true,
      candidacies: {
        where: {
          OR: [
            { selected: true, order: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } },
            { status: "ACCEPTED", order: { status: { in: ["SEARCHING", "CANDIDATES_READY", "SELECTING"] } } },
          ],
        },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
    take: 8,
  });

  return NextResponse.json(
    {
      teammates: rows.map((row) => ({
        id: row.id,
        name: row.name,
        rating: row.rating,
        available: row.available,
        busy: row.candidacies.length > 0,
        games: Array.isArray(row.gameSlugs) ? (row.gameSlugs as string[]) : [],
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
