// app/api/chat/room/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function POST(req: Request) {
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

  /* ──────────────────────────────
   * 2️⃣ BODY
   * ────────────────────────────── */
  const body = await req.json().catch(() => null);
  const targetUid =
    body && typeof body.targetUserId === "string"
      ? body.targetUserId
      : null;

  if (
    !targetUid ||
    targetUid === myUid ||
    !ObjectId.isValid(targetUid)
  ) {
    return NextResponse.json(
      { error: "Invalid target user" },
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
   * 4️⃣ VERIFY TARGET USER EXISTS
   * ────────────────────────────── */
  const exists = await usersCol.findOne(
    { _id: new ObjectId(targetUid) },
    { projection: { _id: 1 } }
  );

  if (!exists) {
    return NextResponse.json(
      { error: "Invalid target user" },
      { status: 400 }
    );
  }

  /* ──────────────────────────────
   * 5️⃣ NORMALIZE MEMBERS
   * ────────────────────────────── */
  const members = [myUid, targetUid].sort();

  /* ──────────────────────────────
   * 6️⃣ TRY FIND FIRST
   * ────────────────────────────── */
  const existing = await roomsCol.findOne({
    type: "direct",
    members,
  });

  if (existing) {
    return NextResponse.json({
      roomId: existing._id.toString(),
      created: false,
    });
  }

  /* ──────────────────────────────
   * 7️⃣ CREATE (WITH DUPLICATE FALLBACK)
   * ────────────────────────────── */
  try {
    const now = new Date();

    const insert = await roomsCol.insertOne({
      type: "direct",
      members,
      createdAt: now,
      lastMessageAt: null,
    });

    return NextResponse.json({
      roomId: insert.insertedId.toString(),
      created: true,
    });
  } catch (err: any) {
    // 💥 Race condition: room created by another request
    if (err?.code === 11000) {
      const retry = await roomsCol.findOne({
        type: "direct",
        members,
      });

      if (retry) {
        return NextResponse.json({
          roomId: retry._id.toString(),
          created: false,
        });
      }
    }

    console.error("chat room create failed:", err);

    return NextResponse.json(
      { error: "Failed to create chat room" },
      { status: 500 }
    );
  }
}
