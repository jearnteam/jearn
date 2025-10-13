import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { verifyCfAccess } from "@/lib/verifyCfAccess";
import { upsertUser } from "@/lib/user";

export async function GET() {
  const h = await headers();
  const tokenFromHeader = h.get("cf-access-jwt-assertion");
  const tokenFromCookie = (await cookies()).get("CF_Authorization")?.value;
  const token = tokenFromHeader ?? tokenFromCookie;

  if (!token) {
    return NextResponse.json({ error: "No CF token" }, { status: 401 });
  }

  try {
    const claims = await verifyCfAccess(token);

    const provider_id = String(claims.sub ?? claims.email ?? "");
    if (!provider_id) throw new Error("Missing sub/email in claims");

    const user = await upsertUser(provider_id, {
      email: claims.email as string | undefined,
      name: claims.name as string | undefined,
      picture: (claims as any).picture as string | undefined,
      email_verified: (claims as any).email_verified ?? true,
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
  } catch (err: any) {
    console.error("CF verify/upsert error:", err?.message || err);
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }
}
