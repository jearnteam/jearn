// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const PUBLIC_PATHS = [
  "/login",
  "/logout",
  "/api/auth",
  "/api/mobile",
  "/api/stream",
  "/api/user/current",
  "/api/notifications",
  "/api/posts",
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

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow API routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow Next.js internals
  if (pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  // Allow public assets/pages
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return NextResponse.next();
  }

  // 🔑 Decode token ONCE
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isExpired =
    typeof token?.exp === "number" && Date.now() >= token.exp * 1000;

  const isAuthenticated = token && !isExpired;

  // 🔐 Authenticated post route
  if (pathname.startsWith("/posts/")) {
    if (!isAuthenticated) {
      const id = pathname.split("/").pop();
      return NextResponse.redirect(new URL(`/post/${id}`, req.url));
    }
    return NextResponse.next();
  }

  // 🌍 Public post route
  if (pathname.startsWith("/post/")) {
    if (isAuthenticated) {
      const id = pathname.split("/").pop();
      return NextResponse.redirect(new URL(`/posts/${id}`, req.url));
    }
    return NextResponse.next();
  }

  // 🔐 General auth check
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 🔒 Admin pages
  if (pathname.startsWith("/dashboard")) {
    const email = token.email?.toLowerCase();
    if (!email || !ADMIN_EMAILS.includes(email)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
