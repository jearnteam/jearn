// app/api/chat/room/[roomId]/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";

export async function GET(
  _req: Request,
  { params }: { params: { roomId: string } }
) {
  /* ──────────────────────────────
   * 1️⃣ AUTH
   * ────────────────────────────── */
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const myUid = session.user.uid;

  if (!ObjectId.isValid(params.roomId)) {
    return NextResponse.json(
      { error: "Invalid room" },
      { status: 400 }
    );
  }

  const roomId = new ObjectId(params.roomId);

  /* ──────────────────────────────
   * 2️⃣ DB
   * ────────────────────────────── */
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const roomsCol = db.collection("chat_rooms");
  const usersCol = db.collection("users");

  /* ──────────────────────────────
   * 3️⃣ Find room & validate membership
   * ────────────────────────────── */
  const room = await roomsCol.findOne({
    _id: roomId,
    members: myUid,
  });

  if (!room) {
    return NextResponse.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  /* ──────────────────────────────
   * 4️⃣ Get partner UID
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
   * 5️⃣ Fetch partner info (FIXED)
   * ────────────────────────────── */
  const partner = await usersCol.findOne(
    { _id: new ObjectId(partnerUid) },
    {
      projection: {
        name: 1,
        avatar: 1,
        avatarUpdatedAt: 1, // ✅ ADD THIS
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
    roomId: roomId.toString(),
    partner: {
      uid: partner._id.toString(),
      name: partner.name,
      avatar: typeof partner.avatar === "string" ? partner.avatar : null,
      avatarUpdatedAt: partner.avatarUpdatedAt ?? null,
    },
  });
}
