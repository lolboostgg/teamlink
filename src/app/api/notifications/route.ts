import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listNotifications, markAllRead, markNotificationRead } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ notifications: [], unread: 0 });

  const rows = await listNotifications(session.user.id);

  return NextResponse.json(
    {
      notifications: rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        href: n.href,
        read: n.readAt !== null,
        createdAt: n.createdAt.getTime(),
      })),
      unread: rows.filter((n) => n.readAt === null).length,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Marks everything read — what opening the bell does. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ ok: false }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { id?: string } | null;
  if (body?.id) await markNotificationRead(session.user.id, body.id);
  else await markAllRead(session.user.id);
  return NextResponse.json({ ok: true });
}
