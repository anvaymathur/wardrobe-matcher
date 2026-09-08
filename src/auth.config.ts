import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

// Edge-safe config (no Prisma) — shared by the middleware and the full auth.
export default {
  providers: [Google],
  pages: { signIn: "/signin" },
} satisfies NextAuthConfig;
