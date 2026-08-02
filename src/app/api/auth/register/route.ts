import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// New accounts always start as CLIENT — becoming a teammate happens later,
// via an admin promoting the account (see the admin users panel), not at
// signup.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const name = String(body?.name ?? "").trim() || null;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { email, name, passwordHash } });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    // Logged server-side (check the Hostinger app logs) instead of leaking
    // connection strings/internals to the client — the client only learns
    // it's an infra problem, not a form-input mistake, so retrying blindly
    // isn't the obvious next move.
    console.error("[register] failed:", err);
    return NextResponse.json(
      { error: "We couldn't create your account right now — the database is unreachable. Try again in a moment." },
      { status: 503 },
    );
  }
}
