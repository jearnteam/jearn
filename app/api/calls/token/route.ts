import { NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { roomName } = await req.json();

  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    {
      identity: session.user.uid,
    }
  );

  at.addGrant({
    roomJoin: true,
    room: roomName,
  });

  return NextResponse.json({
    token: await at.toJwt(),
  });
}