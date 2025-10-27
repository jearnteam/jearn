import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { verifyCfAccess } from "@/lib/verifyCfAccess";
import { upsertUser } from "@/lib/user";
import { Binary } from "mongodb";

interface CfAccessClaims {
  sub?: string;
  email?: string;
  name?: string;
  picture?: Binary;
  email_verified?: boolean;
  _id?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export async function GET() {
  const h = headers();
  const tokenFromHeader = (await h).get("cf-access-jwt-assertion");
  const tokenFromCookie = (await cookies()).get("CF_Authorization")?.value;
  const token = tokenFromHeader ?? tokenFromCookie;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing CF Access token" },
      { status: 401 }
    );
  }

  try {
    const claims = (await verifyCfAccess(token)) as CfAccessClaims;
    const provider_id = String(claims.sub ?? claims.email ?? "");
    if (!provider_id) throw new Error("Missing sub/email in claims");

    const user = await upsertUser(provider_id, {
      email: claims.email,
      name: claims.name,
      picture: claims.picture,
      email_verified: claims.email_verified ?? true,
    });

    return NextResponse.json({
      ok: true,
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        picture: user.picture
          ? `/api/user/avatar/${user._id.toString()}?t=${user.updatedAt?.getTime() || Date.now()}`
          : null,
        bio: user.bio || "",
        email_verified: user.email_verified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.warn("⚠️ CF Access verification failed:", message);

    return NextResponse.json(
      { ok: false, error: "Invalid or expired token" },
      { status: 403 }
    );
  }
}
