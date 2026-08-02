import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Discord from "next-auth/providers/discord";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

// Credentials provider requires JWT sessions (NextAuth can't use database
// sessions with it) — that also means no Account/Session/VerificationToken
// tables are needed, just the User table already in prisma/schema.prisma.
// Discord/Google don't use a Prisma adapter either, for the same reason:
// the jwt() callback below finds-or-creates the matching User row by email
// itself instead of relying on adapter-managed Account rows.
export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, role: user.role };
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
    async jwt({ token, user, account }) {
      if (!user) return token;

      if (account?.provider === "credentials") {
        token.id = user.id!;
        token.role = user.role;
        return token;
      }

      // OAuth sign-in (Discord/Google) — no adapter, so find-or-create the
      // matching User row by email ourselves instead of an Account table.
      const email = user.email;
      if (!email) return token;
      const dbUser =
        (await prisma.user.findUnique({ where: { email } })) ??
        (await prisma.user.create({ data: { email, name: user.name ?? null } }));
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
