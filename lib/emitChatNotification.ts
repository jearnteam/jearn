import { getMongoClient } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { sendPush } from "./push/sendPush";
import { isUserOnline } from "@/ws/src/server";

const GROUP_KEY = "chat";

export async function emitChatNotification({
  userId,
  roomId,
  senderId,
  message,
}: {
  userId: string;
  roomId: string;
  senderId: string;
  message: string;
}) {
  if (
    !ObjectId.isValid(userId) ||
    !ObjectId.isValid(senderId)
  ) return;

  const client = await getMongoClient();
  const db = client.db("jearn");

  const userObj = new ObjectId(userId);
  const senderObj = new ObjectId(senderId);
  const now = new Date();

  // ========================
  // 1️⃣ CHECK LAST ACTIVE (🔥 KEY)
  // ========================
  const user = await db.collection("users").findOne(
    { _id: userObj },
    { projection: { lastActiveAt: 1 } }
  );

  const lastActiveAt = user?.lastActiveAt?.getTime?.() ?? 0;
  const nowTs = Date.now();

  // if user active in last 10s → skip push
  if (nowTs - lastActiveAt < 10_000) return;

  // also skip if online
  if (isUserOnline(userId)) return;

  // ========================
  // 2️⃣ GET SENDER
  // ========================
  const sender = await db.collection("users").findOne(
    { _id: senderObj },
    { projection: { name: 1 } }
  );

  const senderName = sender?.name ?? "Someone";

  // ========================
  // 3️⃣ UPSERT GROUP
  // ========================
  await db.collection("chat_push_groups").updateOne(
    {
      userId: userObj,
      groupKey: GROUP_KEY,
    },
    {
      $set: {
        userId: userObj,
        groupKey: GROUP_KEY,
        updatedAt: now,
        lastMessage: message,
        lastSenderName: senderName,
      },
      $addToSet: {
        senderIds: senderObj,
      },
      $inc: {
        totalCount: 1,
      },
    },
    { upsert: true }
  );

  const group = await db.collection("chat_push_groups").findOne({
    userId: userObj,
    groupKey: GROUP_KEY,
  });

  if (!group) return;

  // ========================
  // 4️⃣ BUILD TEXT
  // ========================
  const senderCount = group.senderIds?.length ?? 1;
  const totalCount = group.totalCount ?? 1;

  let title = "";
  let body = "";

  if (senderCount <= 1) {
    title = `${senderName} messaged you!`;
    body =
      totalCount === 1
        ? message.slice(0, 80)
        : `${totalCount} messages`;
  } else {
    title = `${senderCount} people`;
    body = `${totalCount} new messages`;
  }

  // ========================
  // 5️⃣ SEND PUSH (REPLACE)
  // ========================
  await sendPush(userId, {
    title,
    body,
    url: `/?view=chat`,
    tag: "notify:chat", // 🔥 REPLACE
    count: totalCount,
  });
}