import NextAuth from "next-auth";
import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";

// Google sign-in with JWT sessions. We keep our own `User` row (keyed by email)
// and attach its id to the session so everything can be scoped to the owner.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      await prisma.user.upsert({
        where: { email: user.email },
        update: { name: user.name ?? undefined, image: user.image ?? undefined },
        create: {
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        },
      });
      return true;
    },
    async jwt({ token }) {
      if (token.email && !token.uid) {
        const u = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true },
        });
        if (u) token.uid = u.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) session.user.id = token.uid as string;
      return session;
    },
  },
});
