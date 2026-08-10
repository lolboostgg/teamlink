import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/access";
import { uploadPublicImage } from "@/lib/storage";

const EXTENSIONS: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };

export async function POST(request: Request) {
  try {
    const { user } = await requireAdmin("support");
    const form = await request.formData(); const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No image received." }, { status: 400 });
    const extension = EXTENSIONS[file.type]; if (!extension) return NextResponse.json({ error: "Only JPG, PNG or WEBP images are accepted." }, { status: 400 });
    const url = await uploadPublicImage(`blog/${user.id}-${Date.now()}.${extension}`, await file.arrayBuffer(), file.type);
    return NextResponse.json({ url });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Upload failed." }, { status: 403 }); }
}
