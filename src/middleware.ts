import NextAuth from "next-auth";
import authConfig from "@/auth.config";

// Edge-safe auth (no Prisma) just to read the session and gate routes.
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  // /api/blob mints Blob upload tokens; it does its own auth (and the Blob
  // upload-completed webhook arrives with no session cookie), so it can't sit
  // behind the sign-in redirect.
  const isPublic =
    pathname === "/signin" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/blob");
  if (!req.auth && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    return Response.redirect(url);
  }
});

export const config = {
  // Run on everything except Next internals, the favicon, the PWA manifest,
  // local uploads, and images (all reachable without auth).
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|uploads|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)).*)",
  ],
};
