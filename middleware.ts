// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/manifest.webmanifest",
  "/login",
  "/api/auth",
  "/api/stream",
  "/api/user/current",
  "/api/posts",
  "/api/images",
  "/api/categories",
  "/api/category",
  "/api/tags",
  "/favicon.ico",
  "/_next",
  "/icons",
  "/default-avatar.png",
];

const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(",").map(e => e.trim()) ?? [];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ✅ Public routes
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  if (isPublic) return NextResponse.next();

  // ✅ Get token from NextAuth
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // ✅ Restrict dashboard to specific email(s)
  if (pathname.startsWith("/dashboard")) {
    const userEmail = token.email?.toLowerCase();
    const allowed = ADMIN_EMAILS.map(e => e.toLowerCase());
    if (!userEmail || !allowed.includes(userEmail)) {
      // Not an admin → redirect to home or 403
      const homeUrl = new URL("/", req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
