// app/api/chat/list/route.ts
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { ObjectId } from "mongodb";

export async function GET() {
  const session = await getServerSession(authConfig);

  if (!session?.user?.uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const myUid = new ObjectId(session.user.uid).toString();

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const roomsCol = db.collection("chat_rooms");
  const messagesCol = db.collection("chat_messages");
  const usersCol = db.collection("users");
  const followsCol = db.collection("follow");

  /* -------------------------------------------------
   * 1️⃣ Fetch rooms
   * ------------------------------------------------- */
  const rooms = await roomsCol
    .find({ type: "direct", members: myUid })
    .sort({ lastMessageAt: -1 })
    .toArray();

  const roomIds = rooms.map((r) => r._id);
  const roomPartnerUids = rooms
    .map((r) => r.members.find((uid: string) => uid !== myUid))
    .filter(Boolean) as string[];

  /* -------------------------------------------------
   * 2️⃣ Fetch last messages
   * ------------------------------------------------- */
  const lastMessages = rooms.length
    ? await messagesCol
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
        .toArray()
    : [];

  const lastMessageMap = new Map(
    lastMessages.map((m) => [
      m._id.toString(),
      { text: m.text, createdAt: m.createdAt },
    ])
  );

  /* -------------------------------------------------
   * 2️⃣.5️⃣ Fetch unread counts (🔥 NEW)
   * ------------------------------------------------- */
  const unreadCounts = rooms.length
    ? await messagesCol
        .aggregate([
          {
            $match: {
              roomId: { $in: roomIds },
              senderId: { $ne: myUid },
              readBy: { $ne: myUid },
            },
          },
          {
            $group: {
              _id: "$roomId",
              count: { $sum: 1 },
            },
          },
        ])
        .toArray()
    : [];

  const unreadMap = new Map(
    unreadCounts.map((u) => [u._id.toString(), u.count])
  );

  /* -------------------------------------------------
   * 3️⃣ Fetch followed users (WITH avatarUpdatedAt)
   * ------------------------------------------------- */
  const followLinks = await followsCol
    .find({ followerId: myUid })
    .toArray();

  const followedUserIds = followLinks
    .map((f) => f.followingId)
    .filter(ObjectId.isValid)
    .map((id) => new ObjectId(id));

  const followedUsers = followedUserIds.length
    ? await usersCol
        .find(
          { _id: { $in: followedUserIds } },
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

  const followedMap = new Map(
    followedUsers.map((u) => [
      u._id.toString(),
      {
        uid: u._id.toString(),
        name: u.name,
        avatar: typeof u.avatar === "string" ? u.avatar : null,
        avatarUpdatedAt: u.avatarUpdatedAt ?? null,
      },
    ])
  );

  /* -------------------------------------------------
   * 4️⃣ Build room items (UPDATED)
   * ------------------------------------------------- */
  const roomItems = rooms.map((r) => {
    const partnerUid = r.members.find(
      (uid: string) => uid !== myUid
    )!;

    const roomIdStr = r._id.toString();

    return {
      type: "room" as const,
      roomId: roomIdStr,
      partner:
        followedMap.get(partnerUid) ?? {
          uid: partnerUid,
          name: "Unknown",
          avatar: null,
          avatarUpdatedAt: null,
        },
      lastMessage: lastMessageMap.get(roomIdStr) ?? null,
      unreadCount: unreadMap.get(roomIdStr) ?? 0, // ✅ NEW
    };
  });

  /* -------------------------------------------------
   * 5️⃣ Build “start chat” items
   * ------------------------------------------------- */
  const newChatItems = followedUsers
    .filter((u) => !roomPartnerUids.includes(u._id.toString()))
    .map((u) => ({
      type: "new" as const,
      partner: {
        uid: u._id.toString(),
        name: u.name,
        avatar: typeof u.avatar === "string" ? u.avatar : null,
        avatarUpdatedAt: u.avatarUpdatedAt ?? null,
      },
    }));

  return NextResponse.json({
    rooms: [...roomItems, ...newChatItems],
  });
}
