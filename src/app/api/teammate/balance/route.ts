import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * The teammate's current balance, on its own.
 *
 * The sidebar renders it from the dashboard layout, which is a server render
 * — so it was only ever as fresh as the last full page load. Finishing an
 * order or being tipped changed the number in the database and nowhere else
 * the teammate could see, which is the one number they are watching.
 *
 * Deliberately a single column: this is read on every live signal, and it has
 * no business loading a profile to answer "how much".
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ balanceEUR: null }, { status: 401 });

  const teammate = await prisma.teammate.findUnique({
    where: { userId: session.user.id },
    select: { balanceEUR: true },
  });
  if (!teammate) return NextResponse.json({ balanceEUR: null });

  return NextResponse.json(
    { balanceEUR: Number(teammate.balanceEUR) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
