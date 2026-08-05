import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadPublicImage } from "@/lib/storage";

const EXTENSIONS: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png",
};

/**
 * Profile picture upload. Everyone signed in uploads their own — the path is
 * their account id, so a request can neither overwrite nor guess anyone
 * else's picture, and re-uploading replaces the previous file instead of
 * leaving it behind in the bucket.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No image received." }, { status: 400 });

  const extension = EXTENSIONS[file.type];
  if (!extension) return NextResponse.json({ error: "Only JPG, PNG or WEBP images are accepted." }, { status: 400 });

  try {
    const url = await uploadPublicImage(`${session.user.id}.${extension}`, await file.arrayBuffer(), file.type);
    // The path is stable, so the browser (and Supabase's CDN) would happily
    // keep serving the previous picture without this.
    return NextResponse.json({ url: `${url}?v=${Date.now()}` });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed." }, { status: 400 });
  }
}
