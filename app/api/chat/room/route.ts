import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    console.log("🟢 CHAT ROOM: request received");

    /* ──────────────────────────────
     * 1️⃣ AUTH
     * ────────────────────────────── */
    const session = await getServerSession(authConfig);

    if (!session?.user?.uid || !ObjectId.isValid(session.user.uid)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const myUid = session.user.uid;

    /* ──────────────────────────────
     * 2️⃣ BODY
     * ────────────────────────────── */
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const targetUid =
      typeof body?.targetUserId === "string"
        ? body.targetUserId
        : null;

    if (!targetUid || !ObjectId.isValid(targetUid)) {
      return NextResponse.json(
        { error: "Invalid targetUserId" },
        { status: 400 }
      );
    }

    if (targetUid === myUid) {
      return NextResponse.json(
        { error: "Cannot chat with yourself" },
        { status: 400 }
      );
    }

    /* ──────────────────────────────
     * 3️⃣ DB
     * ────────────────────────────── */
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const roomsCol = db.collection("chat_rooms");
    const usersCol = db.collection("users");

    /* ──────────────────────────────
     * 4️⃣ VERIFY TARGET USER
     * ────────────────────────────── */
    const exists = await usersCol.findOne(
      { _id: new ObjectId(targetUid) },
      { projection: { _id: 1 } }
    );

    if (!exists) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    /* ──────────────────────────────
     * 5️⃣ MEMBERS (SORTED)
     * ────────────────────────────── */
    const members = [myUid, targetUid].sort();

    /* ──────────────────────────────
     * 6️⃣ UPSERT (E11000 SAFE)
     * ────────────────────────────── */
    const now = new Date();
    let room: any = null;

    try {
      const upsertResult = await roomsCol.findOneAndUpdate(
        { type: "direct", members },
        {
          $setOnInsert: {
            type: "direct",
            members,
            createdAt: now,
            lastMessageAt: null,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
        }
      );

      room =
        upsertResult?.value ??
        (await roomsCol.findOne({ type: "direct", members }));
    } catch (e: any) {
      // 🔥 DUPLICATE KEY = ROOM ALREADY EXISTS
      if (e?.code === 11000) {
        room = await roomsCol.findOne({ type: "direct", members });
      } else {
        console.error("🔴 MONGO ERROR:", e);
        return NextResponse.json(
          {
            error: "Mongo error",
            code: e?.code,
            message: e?.message,
          },
          { status: 500 }
        );
      }
    }

    if (!room) {
      console.error("🔴 ROOM NOT FOUND AFTER DUPLICATE");
      return NextResponse.json(
        { error: "Room creation failed" },
        { status: 500 }
      );
    }

    console.log("🟢 ROOM OK:", room._id.toString());

    /* ──────────────────────────────
     * 7️⃣ RESPONSE
     * ────────────────────────────── */
    return NextResponse.json({
      roomId: room._id.toString(),
      created:
        room.createdAt instanceof Date &&
        room.createdAt.getTime() === now.getTime(),
    });
  } catch (err: any) {
    console.error("🔴 UNHANDLED ERROR:", err);
    return NextResponse.json(
      {
        error: "Unhandled error",
        message: err?.message,
      },
      { status: 500 }
    );
  }
}
