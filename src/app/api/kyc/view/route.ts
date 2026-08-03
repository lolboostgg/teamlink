import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { createSignedUrl } from "@/lib/storage";

/**
 * Redirects to a one-minute signed URL for a stored document. Admins can see
 * any teammate's documents; a teammate only ever their own — the path alone
 * is never enough, it's checked against the row that references it.
 */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const path = new URL(request.url).searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Missing path." }, { status: 400 });

  const record = await prisma.teammateVerification.findFirst({
    where: {
      OR: [{ idFrontPath: path }, { idBackPath: path }, { selfiePath: path }],
    },
    include: { teammate: true },
  });
  if (!record) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const isOwner = record.teammate.userId === session.user.id;
  if (!isOwner && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  try {
    return NextResponse.redirect(await createSignedUrl(path, 60));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Couldn't open that document.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
