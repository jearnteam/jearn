import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function updateLastActive(userId: string) {
  if (!ObjectId.isValid(userId)) return;

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  await db.collection("users").updateOne(
    {
      _id: new ObjectId(userId),
      $or: [
        { lastActiveAt: { $lt: new Date(Date.now() - 10 * 60 * 1000) } },
        { lastActiveAt: { $exists: false } },
      ],
    },
    {
      $set: { lastActiveAt: new Date() },
    }
  );
}
