// lib/emitNotification.ts
import { getMongoClient } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { notifyUser } from "@/lib/sse";
import { sendPush } from "./push/sendPush";
import { isUserOnline } from "@/ws/src/server";

type NormalNotificationType = "post_like" | "comment" | "mention" | "answer";

type TypeCounts = {
  post_like: number;
  comment: number;
  mention: number;
  answer: number;
};

type RecentEvent = {
  actorId: ObjectId;
  actorName: string;
  actorAvatar: string | null;
  type: NormalNotificationType;
  postId: ObjectId;
  createdAt: Date;
};

const SOCIAL_GROUP_KEY = "social";
const MAX_RECENT_EVENTS = 12;
const PUSH_COOLDOWN_MS = 5 * 60 * 1000;

export async function emitGroupedNotification({
  userId,
  type,
  postId,
  actorId,
}: {
  userId: string;
  type: NormalNotificationType;
  postId: string;
  actorId: string;
}) {
  if (
    !ObjectId.isValid(userId) ||
    !ObjectId.isValid(postId) ||
    !ObjectId.isValid(actorId)
  ) {
    return;
  }

  const client = await getMongoClient();
  const db = client.db("jearn");

  const receiverId = new ObjectId(userId);
  const actorObjId = new ObjectId(actorId);
  const postObjId = new ObjectId(postId);
  const now = new Date();

  const actor = await db
    .collection("users")
    .findOne(
      { _id: actorObjId },
      { projection: { name: 1, avatarUrl: 1, image: 1 } }
    );

  const actorName = actor?.name ?? "Someone";
  const actorAvatar = actor?.avatarUrl ?? actor?.image ?? null;

  // cleanup broken grouped docs
  await db.collection("notifications").deleteMany({
    userId: receiverId,
    groupKey: SOCIAL_GROUP_KEY,
  });

  // ========================
  // 1. CREATE NORMAL NOTIFICATION
  // ========================
  const inserted = await db.collection("notifications").insertOne({
    userId: receiverId,
    type,
    postId: postObjId,
    actorId: actorObjId,
    actorIds: [actorObjId],
    lastActorId: actorObjId,
    lastActorName: actorName,
    lastActorAvatar: actorAvatar,
    count: 1,
    read: false,
    uiRead: false,
    createdAt: now,
    updatedAt: now,
  });

  notifyUser(userId, {
    _id: inserted.insertedId.toString(),
    type,
    postId,
    lastActorId: actorId,
    lastActorName: actorName,
    lastActorAvatar: actorAvatar,
    count: 1,
    createdAt: now,
    updatedAt: now,
    read: false,
    uiRead: false,
  });

  // ========================
  // 2. CHECK EXISTING GROUP
  // ========================
  const previousGroup = await db.collection("notification_push_groups").findOne(
    {
      userId: receiverId,
      groupKey: SOCIAL_GROUP_KEY,
    },
    {
      projection: {
        _id: 1,
        lastPushAt: 1,
        lastPushBody: 1,
      },
    }
  );

  const hadUnreadGroupAlready = !!previousGroup;

  // ========================
  // 3. UPSERT GROUP
  // ========================
  const newEvent: RecentEvent = {
    actorId: actorObjId,
    actorName,
    actorAvatar,
    type,
    postId: postObjId,
    createdAt: now,
  };

  await db.collection("notification_push_groups").updateOne(
    {
      userId: receiverId,
      groupKey: SOCIAL_GROUP_KEY,
    },
    [
      {
        $set: {
          userId: receiverId,
          groupKey: SOCIAL_GROUP_KEY,
          createdAt: { $ifNull: ["$createdAt", now] },
          updatedAt: now,

          lastType: type,
          lastPostId: postObjId,
          lastActorId: actorObjId,
          lastActorName: actorName,
          lastActorAvatar: actorAvatar,

          actorIds: {
            $setUnion: [{ $ifNull: ["$actorIds", []] }, [actorObjId]],
          },

          totalCount: {
            $add: [{ $ifNull: ["$totalCount", 0] }, 1],
          },

          typeCounts: {
            post_like: {
              $add: [
                { $ifNull: ["$typeCounts.post_like", 0] },
                type === "post_like" ? 1 : 0,
              ],
            },
            comment: {
              $add: [
                { $ifNull: ["$typeCounts.comment", 0] },
                type === "comment" ? 1 : 0,
              ],
            },
            mention: {
              $add: [
                { $ifNull: ["$typeCounts.mention", 0] },
                type === "mention" ? 1 : 0,
              ],
            },
            answer: {
              $add: [
                { $ifNull: ["$typeCounts.answer", 0] },
                type === "answer" ? 1 : 0,
              ],
            },
          },

          recentEvents: {
            $slice: [
              {
                $concatArrays: [[newEvent], { $ifNull: ["$recentEvents", []] }],
              },
              MAX_RECENT_EVENTS,
            ],
          },
        },
      },
    ],
    { upsert: true }
  );

  const pushGroup = await db.collection("notification_push_groups").findOne({
    userId: receiverId,
    groupKey: SOCIAL_GROUP_KEY,
  });

  if (!pushGroup) return;

  const summaryText = buildGroupedSummary(pushGroup);

  // ========================
  // 4. PUSH LOGIC
  // ========================
  const online = isUserOnline(userId);

  const nowTs = Date.now();
  const lastPushAt = pushGroup.lastPushAt?.getTime?.() ?? 0;

  const shouldSendPush = !online && nowTs - lastPushAt > PUSH_COOLDOWN_MS;

  if (shouldSendPush) {
    await sendPush(userId, {
      title: getRandomTitle(),
      body: summaryText,
      url: "/?view=notify",
      tag: "notify:social",
      count: pushGroup.totalCount ?? 1,
    });

    await db.collection("notification_push_groups").updateOne(
      { _id: pushGroup._id },
      {
        $set: {
          lastPushAt: new Date(),
          lastPushBody: summaryText,
        },
      }
    );
  }
}

/* ========================
 * 🧠 SUMMARY BUILDERS
 * ======================== */

function buildGroupedSummary(notification: any) {
  const counts = normalizeTypeCounts(notification.typeCounts);
  const uniqueActorCount = Array.isArray(notification.actorIds)
    ? notification.actorIds.length
    : 0;

  const latestActorName =
    notification.lastActorName ||
    notification.recentEvents?.[0]?.actorName ||
    "Someone";

  const activeTypes = getActiveTypes(counts);

  if (activeTypes.length === 0) {
    return "New activity";
  }

  if (uniqueActorCount <= 1) {
    return buildSingleActorSummary(latestActorName, counts);
  }

  return buildMultiActorSummary(counts);
}

function normalizeTypeCounts(input: any): TypeCounts {
  return {
    post_like: Number(input?.post_like ?? 0),
    comment: Number(input?.comment ?? 0),
    mention: Number(input?.mention ?? 0),
    answer: Number(input?.answer ?? 0),
  };
}

function getActiveTypes(counts: TypeCounts): NormalNotificationType[] {
  const order: NormalNotificationType[] = [
    "post_like",
    "comment",
    "mention",
    "answer",
  ];
  return order.filter((type) => counts[type] > 0);
}

function buildSingleActorSummary(name: string, counts: TypeCounts) {
  const parts: string[] = [];

  if (counts.post_like > 0)
    parts.push(
      counts.post_like === 1
        ? "liked your post"
        : `liked ${counts.post_like} of your posts`
    );

  if (counts.comment > 0)
    parts.push(
      counts.comment === 1
        ? "commented on your post"
        : `commented on ${counts.comment} of your posts`
    );

  if (counts.mention > 0)
    parts.push(
      counts.mention === 1
        ? "mentioned you"
        : `mentioned you ${counts.mention} times`
    );

  if (counts.answer > 0)
    parts.push(
      counts.answer === 1
        ? "answered your question"
        : `answered ${counts.answer} of your questions`
    );

  return parts.length === 0
    ? `${name} interacted with you`
    : `${name} ${joinNatural(parts)}`;
}

function buildMultiActorSummary(counts: TypeCounts) {
  const parts: string[] = [];

  if (counts.post_like > 0)
    parts.push(`${counts.post_like} like${counts.post_like > 1 ? "s" : ""}`);
  if (counts.comment > 0)
    parts.push(`${counts.comment} comment${counts.comment > 1 ? "s" : ""}`);
  if (counts.mention > 0)
    parts.push(`${counts.mention} mention${counts.mention > 1 ? "s" : ""}`);
  if (counts.answer > 0)
    parts.push(`${counts.answer} answer${counts.answer > 1 ? "s" : ""}`);

  if (parts.length === 1) return `You got ${parts[0]}`;
  return `You got ${joinNatural(parts)}`;
}

function joinNatural(parts: string[]) {
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts.at(-1)}`;
}

function getRandomTitle() {
  const pool = [
    "You might want to see this 👀",
    "This just came in 👇",
    "You’ve got some activity",
    "People are interacting with you",
    "Your post is getting attention 🔥",
    "Happening right now ⚡",
  ];
  return pool[Math.floor(Math.random() * pool.length)];
}
