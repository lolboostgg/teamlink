import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { uploadPrivateFile } from "@/lib/storage";

const KINDS = new Set(["id-front", "id-back", "selfie"]);

const COLUMN: Record<string, "idFrontPath" | "idBackPath" | "selfiePath"> = {
  "id-front": "idFrontPath",
  "id-back": "idBackPath",
  selfie: "selfiePath",
};

// Teammates upload their own documents; nobody uploads for anyone else (an
// admin reviews, but never submits on a teammate's behalf).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const teammate = await prisma.teammate.findUnique({ where: { userId: session.user.id } });
  if (!teammate) return NextResponse.json({ error: "No teammate profile." }, { status: 403 });

  const form = await request.formData();
  const kind = String(form.get("kind") ?? "");
  const file = form.get("file");

  if (!KINDS.has(kind)) return NextResponse.json({ error: "Unknown document type." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });

  try {
    // Stable path per document — a resubmission upserts over the old file.
    const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = await uploadPrivateFile(`${teammate.id}/${kind}.${ext}`, file);

    // Written out rather than a computed key so the column stays type-checked.
    const column = COLUMN[kind];
    const patch =
      column === "idFrontPath"
        ? { idFrontPath: path }
        : column === "idBackPath"
          ? { idBackPath: path }
          : { selfiePath: path };

    await prisma.teammateVerification.upsert({
      where: { teammateId: teammate.id },
      create: { teammateId: teammate.id, ...patch },
      update: patch,
    });

    return NextResponse.json({ path });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
