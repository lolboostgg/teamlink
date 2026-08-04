import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { discordDisplayName } from "@/lib/discord";
import { decryptTwoFactorSecret, readTwoFactor, verifyTwoFactorCode } from "@/lib/twoFactor";

// Credentials provider requires JWT sessions (NextAuth can't use database
// sessions with it) — that also means no Account/Session/VerificationToken
// tables are needed, just the User table already in prisma/schema.prisma.
// Discord/Google don't use a Prisma adapter either, for the same reason:
// the jwt() callback below finds-or-creates the matching User row by email
// itself instead of relying on adapter-managed Account rows.
const REMEMBERED_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days
const NOT_REMEMBERED_MAX_AGE_SECONDS = 24 * 60 * 60; // 1 day

// JWT sessions are stored in cookies. An uploaded avatar is often a base64
// data URL several kilobytes large; putting that into `token.picture` makes
// the Set-Cookie header exceed the browser/proxy limit and turns an otherwise
// successful credentials login into a 500. Remote provider URLs are small
// enough to keep; uploaded images are loaded from our database in dashboards.
function sessionSafeAvatar(value: string | null | undefined): string | null {
  if (!value || value.startsWith("data:")) return null;
  return value.length <= 2_000 ? value : null;
}

// The union of the Discord and Google profile fields we actually read.
// NextAuth's own Profile type is deliberately loose, so this keeps the two
// providers' shapes in one place instead of casting at every use.
interface OAuthProfile {
  id?: string;
  email?: string | null;
  name?: string | null;
  /** Google */
  email_verified?: boolean;
  /** Discord */
  verified?: boolean;
  username?: string;
  global_name?: string | null;
  discriminator?: string | null;
  avatar?: string | null;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt", maxAge: REMEMBERED_MAX_AGE_SECONDS },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        remember: {},
        otp: {},
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

          const twoFactor = readTwoFactor(user.notificationPrefs);
          if (twoFactor) {
            const secret = decryptTwoFactorSecret(twoFactor.secret);
            const otp = String(credentials?.otp ?? "");
            if (!secret || !verifyTwoFactorCode(secret, otp)) return null;
          }

          // Stashed on the returned user object so the jwt() callback below
          // can read it on initial sign-in (only `authorize` sees the raw
          // credentials) — not a real User field, just a one-shot carrier.
          const remember = credentials?.remember !== "false";
          return { id: user.id, email: user.email, name: user.name, image: sessionSafeAvatar(user.avatarUrl), role: user.role, remember };
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
      // `email` on top of the default `identify` — we key accounts by email,
      // so a sign-in without one can't be matched to anything.
      authorization: { params: { scope: "identify email" } },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          // Always land on the account chooser instead of silently reusing
          // whichever Google account the browser happens to be signed into.
          prompt: "select_account",
        },
      },
    }),
  ],
  // OAuth failures land back on the homepage with ?authError=… instead of
  // NextAuth's bare /api/auth/error page — AuthErrorToast turns that into a
  // readable message.
  pages: { signIn: "/", error: "/" },
  callbacks: {
    // Runs before jwt(). Everything that should *stop* an OAuth sign-in
    // belongs here: returning a string redirects with a reason attached,
    // whereas bailing out inside jwt() would hand out a session with no
    // user id — signed in on paper, broken everywhere else.
    async signIn({ account, profile }) {
      if (!account || account.provider === "credentials") return true;

      const oauth = profile as OAuthProfile | undefined;
      const email = oauth?.email?.trim().toLowerCase();
      if (!email) return "/?authError=no_email";

      // We merge OAuth logins into an existing account by email, so an
      // unverified address would let anyone who can claim it take over that
      // account. Google sends email_verified, Discord sends verified; both
      // omit the field on some account types, so only an explicit `false`
      // rejects.
      const verified = oauth?.email_verified ?? oauth?.verified;
      if (verified === false) return "/?authError=unverified_email";

      return true;
    },

    async jwt({ token, user, account, profile, trigger }) {
      // Fired by the client calling useSession().update() with no payload
      // (see ClientProfileForm/TeammateProfileEditor after a successful
      // save) — re-reads the DB instead of trusting a client-supplied
      // patch, so the header avatar/name reflect what was actually saved.
      if (trigger === "update" && token.id) {
        const fresh = await prisma.user.findUnique({ where: { id: token.id as string } });
        if (fresh) {
          token.name = fresh.name;
          token.picture = sessionSafeAvatar(fresh.avatarUrl);
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
      // signIn() above already guaranteed there is a verified email.
      const oauth = profile as OAuthProfile | undefined;
      const email = (oauth?.email ?? user.email ?? "").trim().toLowerCase();
      if (!email) return token;

      let dbUser = await prisma.user.findUnique({ where: { email } });

      if (!dbUser) {
        // First sign-in through a provider *is* the signup — take the name
        // and picture along so the header isn't blank on the first page.
        dbUser = await prisma.user.create({
          data: {
            email,
            name: user.name ?? oauth?.name ?? null,
            avatarUrl: user.image ?? null,
          },
        });
      } else if (!dbUser.avatarUrl && user.image) {
        // Existing password account signing in via OAuth for the first time:
        // fill the gaps, never overwrite something the user set themselves.
        dbUser = await prisma.user.update({
          where: { id: dbUser.id },
          data: { avatarUrl: user.image, name: dbUser.name ?? user.name ?? null },
        });
      }

      // Signing in through Discord also counts as linking it, so the handle
      // shows up in the admin lists and can be notified later. Skipped when
      // that Discord account already belongs to someone else — discordId is
      // unique, and silently stealing it would break the other account.
      if (account?.provider === "discord" && oauth?.id) {
        const discordId = String(oauth.id);
        const owner = await prisma.user.findUnique({ where: { discordId }, select: { id: true } });
        if (!owner || owner.id === dbUser.id) {
          const displayName = discordDisplayName({
            id: discordId,
            username: oauth.username ?? "",
            global_name: oauth.global_name,
            discriminator: oauth.discriminator,
          });
          await prisma.user.update({
            where: { id: dbUser.id },
            data: {
              discordId,
              discordUsername: displayName || discordId,
              discordAvatar: oauth.avatar ?? null,
              discordLinkedAt: new Date(),
            },
          });
        }
      }

      token.id = dbUser.id;
      token.role = dbUser.role;
      token.name = dbUser.name;
      token.picture = sessionSafeAvatar(dbUser.avatarUrl);
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
