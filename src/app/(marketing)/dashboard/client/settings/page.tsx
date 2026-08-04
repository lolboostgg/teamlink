import type { Metadata } from "next";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { SettingsScreen } from "@/components/dashboard/client/SettingsScreen";
import { sanitizeNotificationPrefs } from "@/lib/notificationPrefs";
import { headers } from "next/headers";
import { readTwoFactor } from "@/lib/twoFactor";

export const metadata: Metadata = { title: "Settings" };
// Direct top-level Prisma query in a Server Component — same build-time-
// probe hazard as the other dashboard pages, see lib/db.ts.
export const dynamic = "force-dynamic";

async function resolveLoginLocation(ip: string, headerCity: string | null, country: string | null) {
  let city = headerCity;
  try { city = headerCity ? decodeURIComponent(headerCity) : null; } catch {}
  if (city) return [city, country].filter(Boolean).join(", ");
  if (!ip || ip === "Unknown IP" || /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip)) return country ?? "Location unavailable";
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, { next: { revalidate: 86_400 }, signal: AbortSignal.timeout(1_500) });
    const result = await response.json() as { success?: boolean; city?: string; region?: string; country_code?: string };
    if (response.ok && result.success !== false) return [result.city, result.region, result.country_code ?? country].filter(Boolean).join(", ");
  } catch {}
  return country ?? "Location unavailable";
}

export default async function ClientSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ discord?: string }>;
}) {
  const { discord } = await searchParams;
  const requestHeaders = await headers();
  const userAgent = requestHeaders.get("user-agent") ?? "Unknown device";
  const device = /mobile|android|iphone/i.test(userAgent) ? "Mobile device" : /macintosh|mac os/i.test(userAgent) ? "Mac" : /windows/i.test(userAgent) ? "Windows PC" : "Desktop device";
  const browser = /edg\//i.test(userAgent) ? "Edge" : /chrome\//i.test(userAgent) ? "Chrome" : /firefox\//i.test(userAgent) ? "Firefox" : /safari\//i.test(userAgent) ? "Safari" : "Web browser";
  const ip = (requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("cf-connecting-ip") ?? "Unknown IP").split(",")[0].trim();
  const city = requestHeaders.get("x-vercel-ip-city") ?? requestHeaders.get("cf-ipcity");
  const country = requestHeaders.get("x-vercel-ip-country") ?? requestHeaders.get("cf-ipcountry");
  const location = await resolveLoginLocation(ip, city, country);
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          accountNo: true,
          name: true,
          email: true,
          avatarUrl: true,
          discordId: true,
          discordUsername: true,
          discordAvatar: true,
          notificationPrefs: true,
        },
      })
    : null;

  if (!user) {
    return (
      <div className="dashboard-panel">
        <div className="dashboard-panel__head">
          <div>
            <div className="dashboard-panel__title">Settings</div>
            <div className="dashboard-panel__sub">Sign in to manage your account.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SettingsScreen
      account={{
        accountNo: user.accountNo,
        name: user.name ?? "",
        email: user.email,
        avatarUrl: user.avatarUrl ?? "",
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        discordAvatar: user.discordAvatar,
        discordStatus: discord,
        prefs: sanitizeNotificationPrefs(user.notificationPrefs),
        twoFactorEnabled: Boolean(readTwoFactor(user.notificationPrefs)),
        loginActivity: [{ ip, device: `${browser} on ${device}`, location, current: true }],
      }}
    />
  );
}
