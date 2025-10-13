import { NextResponse, NextRequest } from "next/server";
import { headers, cookies } from "next/headers";
import { verifyCfAccess } from "@/lib/verifyCfAccess";
import { upsertUser } from "@/lib/user";

// 👇 define a type for the claims returned by verifyCfAccess
interface CfAccessClaims {
  sub?: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  [key: string]: unknown; // for extra fields we don't care about
}

export async function GET() {
  const h = headers();
  const tokenFromHeader = (await h).get("cf-access-jwt-assertion");
  const tokenFromCookie = (await cookies()).get("CF_Authorization")?.value;
  const token = tokenFromHeader ?? tokenFromCookie;

  if (!token) {
    return NextResponse.json({ error: "No CF token" }, { status: 401 });
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
        picture: user.picture,
        email_verified: user.email_verified,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error during verification";
    console.error("CF verify/upsert error:", message);

    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }
}