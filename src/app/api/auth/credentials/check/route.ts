import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { readTwoFactor } from "@/lib/twoFactor";
import { enforceRateLimit } from "@/lib/admin/rateLimit";

/**
 * Verifies a password ahead of signIn(), so the modal can branch to the
 * two-factor step instead of bouncing the user off a failed login.
 *
 * It runs the same bcrypt.compare() the credentials provider runs, which
 * makes it the same brute-force surface — so it shares the provider's
 * budget rather than getting its own. The key is deliberately identical to
 * the one in auth.ts: a separate key would hand an attacker two budgets and
 * leave this the cheaper of the two doors, which is exactly the hole being
 * closed. The cost is that one real login spends two of the ten (this call,
 * then the provider's), leaving five attempts per quarter hour.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  if (!email || !password) return NextResponse.json({ valid: false }, { status: 400 });

  const forwarded =
    request.headers.get("x-forwarded-for") ?? request.headers.get("cf-connecting-ip") ?? "Unknown IP";
  const ip = forwarded.split(",")[0].trim();

  try {
    await enforceRateLimit(`login:${email}:${ip}`, 10, 15 * 60_000);
  } catch {
    // Distinguished from a wrong password on purpose: someone who has been
    // throttled needs to know that waiting is what fixes it, otherwise they
    // keep retrying a password that was right all along.
    return NextResponse.json(
      { valid: false, rateLimited: true, error: "Too many attempts. Try again in 15 minutes." },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { passwordHash: true, notificationPrefs: true, bannedAt: true, bannedReason: true },
  });
  const valid = Boolean(user?.passwordHash && await bcrypt.compare(password, user.passwordHash));
  if (!valid) return NextResponse.json({ valid: false }, { status: 401 });
  // Only reveal a ban after the password has been proven. Otherwise this
  // endpoint would disclose which email addresses belong to banned accounts.
  if (user?.bannedAt) {
    return NextResponse.json(
      { valid: false, banned: true, reason: user.bannedReason || "No reason was provided." },
      { status: 403 },
    );
  }
  return NextResponse.json({ valid: true, requiresTwoFactor: Boolean(readTwoFactor(user?.notificationPrefs)) });
}
