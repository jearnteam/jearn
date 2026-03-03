import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { ObjectId } from "mongodb";

export const runtime = "nodejs";

export async function GET() {
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid || !ObjectId.isValid(session.user.uid)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myObjectId = new ObjectId(session.user.uid);

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const roomsCol = db.collection("chat_rooms");
  const messagesCol = db.collection("chat_messages");
  const usersCol = db.collection("users");

  /* ──────────────────────────────
     1️⃣ Fetch my direct rooms
  ────────────────────────────── */

  const rooms = await roomsCol
    .find({
      type: "direct",
      members: myObjectId, // ✅ ObjectId match
    })
    .toArray();

  if (!rooms.length) {
    return NextResponse.json({ rooms: [] });
  }

  const roomIds = rooms.map((r) => r._id);

  /* ──────────────────────────────
     2️⃣ Fetch last message per room
  ────────────────────────────── */

  const lastMessages = await messagesCol
    .aggregate([
      { $match: { roomId: { $in: roomIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$roomId",
          text: { $first: "$text" },
          createdAt: { $first: "$createdAt" },
        },
      },
    ])
    .toArray();

  if (!lastMessages.length) {
    return NextResponse.json({ rooms: [] });
  }

  const lastMessageMap = new Map(
    lastMessages.map((m) => [
      m._id.toString(),
      { text: m.text, createdAt: m.createdAt },
    ])
  );

  /* ──────────────────────────────
     3️⃣ Unread counts
  ────────────────────────────── */

  const unreadCounts = await messagesCol
    .aggregate([
      {
        $match: {
          roomId: { $in: roomIds },
          senderId: { $ne: myObjectId },
          readBy: { $ne: myObjectId },
        },
      },
      {
        $group: {
          _id: "$roomId",
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const unreadMap = new Map(
    unreadCounts.map((u) => [u._id.toString(), u.count])
  );

  /* ──────────────────────────────
     4️⃣ Collect partner ObjectIds
  ────────────────────────────── */

  const partnerObjectIds = rooms
    .map((r) =>
      r.members.find((uid: ObjectId) => !uid.equals(myObjectId))
    )
    .filter(Boolean) as ObjectId[];

  const partnerUsers = partnerObjectIds.length
    ? await usersCol
        .find(
          { _id: { $in: partnerObjectIds } },
          {
            projection: {
              name: 1,
              avatar: 1,
              avatarUpdatedAt: 1,
            },
          }
        )
        .toArray()
    : [];

  const partnerMap = new Map(
    partnerUsers.map((u) => [
      u._id.toString(),
      {
        uid: u._id.toString(),
        name: u.name ?? "Unknown",
        avatar: typeof u.avatar === "string" ? u.avatar : null,
        avatarUpdatedAt: u.avatarUpdatedAt ?? null,
      },
    ])
  );

  /* ──────────────────────────────
     5️⃣ Build final response
  ────────────────────────────── */

  const roomItems = rooms
    .map((r) => {
      const roomIdStr = r._id.toString();
      const lastMessage = lastMessageMap.get(roomIdStr);
      if (!lastMessage) return null;

      const partnerObjectId = r.members.find(
        (uid: ObjectId) => !uid.equals(myObjectId)
      );

      if (!partnerObjectId) return null;

      const partner =
        partnerMap.get(partnerObjectId.toString()) ?? {
          uid: partnerObjectId.toString(),
          name: "Unknown",
          avatar: null,
          avatarUpdatedAt: null,
        };

      return {
        type: "room" as const,
        roomId: roomIdStr,
        partner,
        lastMessage,
        unreadCount: unreadMap.get(roomIdStr) ?? 0,
      };
    })
    .filter(Boolean)
    .sort(
      (a: any, b: any) =>
        new Date(b.lastMessage.createdAt).getTime() -
        new Date(a.lastMessage.createdAt).getTime()
    );

  return NextResponse.json({ rooms: roomItems });
}