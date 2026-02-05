// app/api/chat/room/[roomId]/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  /* ──────────────────────────────
   * 1️⃣ AUTH
   * ────────────────────────────── */
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid || !ObjectId.isValid(session.user.uid)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const myUid = session.user.uid; // 🔥 STRING UID

  /* ──────────────────────────────
   * 2️⃣ PARAMS (🔥 MUST AWAIT)
   * ────────────────────────────── */
  const { roomId } = await params;

  if (!ObjectId.isValid(roomId)) {
    return NextResponse.json(
      { error: "Invalid room" },
      { status: 400 }
    );
  }

  const roomObjectId = new ObjectId(roomId);

  /* ──────────────────────────────
   * 3️⃣ DB
   * ────────────────────────────── */
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const roomsCol = db.collection("chat_rooms");
  const usersCol = db.collection("users");

  /* ──────────────────────────────
   * 4️⃣ Find room & validate membership
   * ────────────────────────────── */
  const room = await roomsCol.findOne({
    _id: roomObjectId,
    members: myUid, // 🔥 STRING MATCH
  });

  if (!room) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  /* ──────────────────────────────
   * 5️⃣ Get partner UID
   * ────────────────────────────── */
  const partnerUid = room.members.find(
    (uid: string) => uid !== myUid
  );

  if (!partnerUid || !ObjectId.isValid(partnerUid)) {
    return NextResponse.json(
      { error: "Invalid room" },
      { status: 400 }
    );
  }

  /* ──────────────────────────────
   * 6️⃣ Fetch partner info
   * ────────────────────────────── */
  const partner = await usersCol.findOne(
    { _id: new ObjectId(partnerUid) },
    {
      projection: {
        name: 1,
        bio: 1,
        avatar: 1,
        avatarUpdatedAt: 1,
      },
    }
  );

  if (!partner) {
    return NextResponse.json(
      { error: "User missing" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    roomId: roomObjectId.toString(),
    partner: {
      uid: partner._id.toString(),
      name: partner.name ?? null,
      bio: partner.bio ?? null,
      avatar: typeof partner.avatar === "string" ? partner.avatar : null,
      avatarUpdatedAt: partner.avatarUpdatedAt ?? null,
    },
  });
}
