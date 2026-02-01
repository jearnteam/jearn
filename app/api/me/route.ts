import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export async function GET() {
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    uid: session.user.uid,
    name: session.user.name,
    avatar: session.user.image ?? null,
  });
}
