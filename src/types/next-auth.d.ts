import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    /**
     * Unix seconds of the last role re-read from the database. Throttles the
     * refresh in auth.ts's jwt callback so a role change lands on reload
     * without querying on every single request.
     */
    roleCheckedAt?: number;
  }
}
