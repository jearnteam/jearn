// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // Clear your app session cookie
  res.cookies.set({
    name: "CF_AppSession",
    value: "",
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0, // 👈 expire immediately
    domain: "www.jearn.site", // 👈 must match exactly
  });

  return res;
}
