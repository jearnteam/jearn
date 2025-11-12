// app/api/posts/helpers.ts
import { ObjectId } from "mongodb";

/** 🔄 Helper: find a user by flexible author ID */
export async function findUserByAuthorId(users: any, authorId: string) {
  return (
    (await users.findOne({ uid: authorId })) ||
    (ObjectId.isValid(authorId) &&
      (await users.findOne({ _id: new ObjectId(authorId) }))) ||
    (await users.findOne({ _id: authorId })) ||
    (await users.findOne({ userId: authorId })) ||
    (await users.findOne({ email: authorId })) ||
    null
  );
}

/** ✅ Helper to build consistent avatar URL */
export function getAvatarUrl(authorId: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/user/avatar/${authorId}?t=${Date.now()}`;
}
