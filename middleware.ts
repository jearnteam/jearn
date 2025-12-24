// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/login",
  "/logout",

  // ✅ NextAuth MUST be fully public
  "/api/auth",

  // SSE / public APIs
  "/api/stream",
  "/api/user/current",

  "/api/images",
  "/api/categories",
  "/api/category",
  "/api/tags",

  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons",
  "/default-avatar.png",
];

const ADMIN_EMAILS =
  process.env.ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()) ?? [];

// middleware.ts
export async function middleware(req: NextRequest) {
  if (req.method === "OPTIONS") {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // ✅ Always allow Next.js internals
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // ✅ PUBLIC PROFILE PAGES (FIX)
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return NextResponse.next();
  }

  // ✅ Allow all other public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // 🔐 Auth check
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 🔒 Admin-only routes
  if (pathname.startsWith("/dashboard")) {
    const email = token.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.includes(email)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Run middleware on all routes except:
     * - _next static files
     * - static assets
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
