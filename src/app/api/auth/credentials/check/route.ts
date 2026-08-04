import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { readTwoFactor } from "@/lib/twoFactor";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  const password = body?.password ?? "";
  if (!email || !password) return NextResponse.json({ valid: false }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { email }, select: { passwordHash: true, notificationPrefs: true } });
  const valid = Boolean(user?.passwordHash && await bcrypt.compare(password, user.passwordHash));
  if (!valid) return NextResponse.json({ valid: false }, { status: 401 });
  return NextResponse.json({ valid: true, requiresTwoFactor: Boolean(readTwoFactor(user?.notificationPrefs)) });
}
