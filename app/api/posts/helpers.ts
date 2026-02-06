// app/api/posts/helpers.ts
import { ObjectId, Collection, WithId, Document } from "mongodb";

/** 🔄 Helper: find a user by flexible author ID */
export async function findUserByAuthorId(
  users: Collection,
  authorId: string
): Promise<WithId<Document> | null> {
  // 1️⃣ uid (NextAuth / custom)
  const byUid = await users.findOne({ uid: authorId });
  if (byUid) return byUid;

  // 2️⃣ ObjectId (_id)
  if (ObjectId.isValid(authorId)) {
    const byObjectId = await users.findOne({
      _id: new ObjectId(authorId),
    });
    if (byObjectId) return byObjectId;
  }

  // ❌ REMOVED: string _id lookup (invalid in strict Mongo typing)
  // await users.findOne({ _id: authorId });

  // 3️⃣ public uniqueId
  const byUniqueId = await users.findOne({ uniqueId: authorId });
  if (byUniqueId) return byUniqueId;

  // 4️⃣ email fallback
  const byEmail = await users.findOne({ email: authorId });
  if (byEmail) return byEmail;

  return null;
}

/** ✅ Helper to build consistent avatar URL (cache-busting) */
export function getAvatarUrl(authorId: string): string {
  const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";
  return `${CDN}/avatars/${authorId}.webp?t=${Date.now()}`;
}
