import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { uploadPrivateFile, createSignedUrl } from "@/lib/storage";
import { assertAssignedTeammate, DispatchError } from "@/lib/dispatch/service";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Uploads a game-result screenshot for an order the caller is assigned to. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const teammate = await prisma.teammate.findUnique({ where: { userId: session.user.id } });
  if (!teammate) return NextResponse.json({ error: "No teammate profile." }, { status: 403 });

  const form = await request.formData();
  const orderId = String(form.get("orderId") ?? "");
  const gameNumber = Number(form.get("gameNumber") ?? 0);
  const file = form.get("file");

  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
  // Checked against the sniffed type the platform reports, not the filename.
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Screenshots must be JPG, PNG or WEBP." }, { status: 400 });
  }

  try {
    await assertAssignedTeammate(orderId, teammate.id);
    const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const path = await uploadPrivateFile(`${orderId}/game-${gameNumber}.${ext}`, file, "proofs");
    return NextResponse.json({ path, name: file.name });
  } catch (err) {
    const status = err instanceof DispatchError ? 403 : 400;
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed." }, { status });
  }
}

/** Signed read for a stored proof — the assigned teammate, the customer who
 * booked the order, or an admin. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const path = new URL(request.url).searchParams.get("path");
  if (!path) return NextResponse.json({ error: "Missing path." }, { status: 400 });

  const game = await prisma.sessionGame.findFirst({ where: { proofPath: path } });
  if (!game) return NextResponse.json({ error: "Not found." }, { status: 404 });

  // Teammates and admins only. The customer used to be allowed through here
  // as well, but a proof screenshot is evidence for us, not something the
  // person who booked the session is meant to see — it is a picture of
  // somebody's game client, submitted to settle whether the work happened.
  if (session.user.role !== "ADMIN") {
    const teammate = await prisma.teammate.findUnique({ where: { userId: session.user.id } });
    if (!teammate) return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    try {
      await assertAssignedTeammate(game.orderId, teammate.id);
    } catch {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  try {
    return NextResponse.redirect(await createSignedUrl(path, 60, "proofs"));
  } catch {
    return NextResponse.json({ error: "Couldn't open that screenshot." }, { status: 500 });
  }
}
