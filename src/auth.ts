import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { discordDisplayName } from "@/lib/discord";

// Credentials provider requires JWT sessions (NextAuth can't use database
// sessions with it) — that also means no Account/Session/VerificationToken
// tables are needed, just the User table already in prisma/schema.prisma.
// Discord/Google don't use a Prisma adapter either, for the same reason:
// the jwt() callback below finds-or-creates the matching User row by email
// itself instead of relying on adapter-managed Account rows.
const REMEMBERED_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
const NOT_REMEMBERED_MAX_AGE_SECONDS = 24 * 60 * 60; // 1 day

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: REMEMBERED_MAX_AGE_SECONDS },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        remember: {},
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        try {
          const user = await prisma.user.findUnique({ where: { email } });
          if (!user?.passwordHash) return null;

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) return null;

          // Stashed on the returned user object so the jwt() callback below
          // can read it on initial sign-in (only `authorize` sees the raw
          // credentials) — not a real User field, just a one-shot carrier.
          const remember = credentials?.remember !== "false";
          return { id: user.id, email: user.email, name: user.name, image: user.avatarUrl, role: user.role, remember };
        } catch (err) {
          // Logged server-side instead of surfacing raw DB errors through
          // NextAuth's generic CredentialsSignin error — check the
          // Hostinger app logs for the real cause (same class of issue as
          // api/auth/register: a database that couldn't be reached).
          console.error("[auth] credentials lookup failed:", err);
          return null;
        }
      },
    }),
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user, account, profile, trigger }) {
      // Fired by the client calling useSession().update() with no payload
      // (see ClientProfileForm/TeammateProfileEditor after a successful
      // save) — re-reads the DB instead of trusting a client-supplied
      // patch, so the header avatar/name reflect what was actually saved.
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (fresh) {
          token.name = fresh.name;
          token.picture = fresh.avatarUrl;
          token.role = fresh.role;
        }
        return token;
      }

      if (!user) return token;

      if (account?.provider === "credentials") {
        token.id = user.id!;
        token.role = user.role;
        // "Remember me" unchecked -> shorten this token's own expiry below
        // the session-wide 30-day maxAge. The default JWT encoder honors an
        // explicit exp claim if one's already set, so this makes the
        // session expire in 1 day without touching the cookie itself.
        if ((user as { remember?: boolean }).remember === false) {
          token.exp = Math.floor(Date.now() / 1000) + NOT_REMEMBERED_MAX_AGE_SECONDS;
        }
        return token;
      }

      // OAuth sign-in (Discord/Google) — no adapter, so find-or-create the
      // matching User row by email ourselves instead of an Account table.
      const email = user.email;
      if (!email) return token;
      const dbUser =
        (await prisma.user.findUnique({ where: { email } })) ??
        (await prisma.user.create({ data: { email, name: user.name ?? null } }));

      // Signing in through Discord also counts as linking it, so the handle
      // shows up in the admin lists and can be notified later. Skipped when
      // that Discord account already belongs to someone else — discordId is
      // unique, and silently stealing it would break the other account.
      const discordProfile = profile as
        | { id?: string; username?: string; global_name?: string | null; discriminator?: string | null; avatar?: string | null }
        | undefined;

      if (account?.provider === "discord" && discordProfile?.id) {
        const discordId = String(discordProfile.id);
        const owner = await prisma.user.findUnique({ where: { discordId }, select: { id: true } });
        if (!owner || owner.id === dbUser.id) {
          const displayName = discordDisplayName({
            id: discordId,
            username: discordProfile.username ?? "",
            global_name: discordProfile.global_name,
            discriminator: discordProfile.discriminator,
          });
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              discordId,
              discordUsername: displayName || discordId,
              discordAvatar: discordProfile.avatar ?? null,
              discordLinkedAt: new Date(),
            },
          });
        }
      }

      token.id = dbUser.id;
      token.role = dbUser.role;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
});
