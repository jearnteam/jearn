//@/app/api/auth/google/revoke/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function GET(req: Request) {
  try {
    // Manually wrap Fetch Request → NextRequest
    const nextReq = new NextRequest(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body ?? null,
      // NOTE: body may be null for GET requests (that's OK)
    });

    const token = await getToken({
      req: nextReq,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (!token?.accessToken) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Revoke Google token
    await fetch(
      "https://oauth2.googleapis.com/revoke?token=" + token.accessToken,
      { method: "POST" }
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Google revoke error:", err);
    return NextResponse.json({ ok: false, error: true });
  }
}
