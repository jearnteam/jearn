import { getMongoClient } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig);

    if (!session?.user?.uid || !ObjectId.isValid(session.user.uid)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const myObjectId = new ObjectId(session.user.uid);

    const body = await req.json();
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

    if (targetUid === session.user.uid) {
      return NextResponse.json(
        { error: "Cannot chat with yourself" },
        { status: 400 }
      );
    }

    const targetObjectId = new ObjectId(targetUid);
    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const roomsCol = db.collection("chat_rooms");
    const usersCol = db.collection("users");

    const exists = await usersCol.findOne(
      { _id: targetObjectId },
      { projection: { _id: 1 } }
    );

    if (!exists) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    const sortedIds = [myObjectId, targetObjectId].sort((a, b) =>
      a.toString().localeCompare(b.toString())
    );

    const roomKey = sortedIds
      .map((id) => id.toString())
      .join(":");

    let room = await roomsCol.findOne({
      type: "direct",
      roomKey,
    });

    if (!room) {
      try {
        const insert = await roomsCol.insertOne({
          type: "direct",
          roomKey,
          members: sortedIds, // ✅ ObjectId[]
          createdAt: new Date(),
          lastMessageAt: null,
        });

        room = {
          _id: insert.insertedId,
        };
      } catch (e: any) {
        if (e?.code === 11000) {
          room = await roomsCol.findOne({
            type: "direct",
            roomKey,
          });
        } else {
          return NextResponse.json(
            { error: "Insert error" },
            { status: 500 }
          );
        }
      }
    }

    if (!room) {
      return NextResponse.json(
        { error: "Room creation failed" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      roomId: room._id.toString(),
    });

  } catch {
    return NextResponse.json(
      { error: "Unhandled error" },
      { status: 500 }
    );
  }
}