// lib/push/sendPush.ts
import webpush from "web-push";
import { getMongoClient } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function sendPush(userId: string, payload: any) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  if (!ObjectId.isValid(userId)) return;

  const client = await getMongoClient();
  const db = client.db("jearn");

  const userObjectId = new ObjectId(userId);

  const subscriptions = await db
    .collection("push_subscriptions")
    .find({ userId: userObjectId })
    .toArray();

  if (!subscriptions.length) return;

  await Promise.all(
    subscriptions.map(async (subDoc) => {
      if (!subDoc?.subscription) return;

      try {
        await webpush.sendNotification(
          subDoc.subscription,
          JSON.stringify(payload)
        );
      } catch (err: any) {
        console.error("❌ PUSH SEND ERROR:", err);

        const statusCode = err?.statusCode;

        if (statusCode === 404 || statusCode === 410) {
          await db.collection("push_subscriptions").deleteOne({
            userId: userObjectId,
            endpoint: subDoc.endpoint ?? subDoc.subscription?.endpoint,
          });
        }
      }
    })
  );
}
