import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { getMongoClient } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET() {
  const session = await getServerSession(authConfig);
  const client = await getMongoClient();
  const db = client.db("jearn");

  if (!session?.user?.uid) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  await db.collection("chat_push_groups").deleteOne({
    userId: new ObjectId(session?.user?.uid),
  });

  return NextResponse.json({
    uid: session.user.uid,
    name: session.user.name,
    avatar: session.user.picture ?? session.user.image ?? null,
  });
}
