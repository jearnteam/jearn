// @/app/api/subscribe/route.ts
import { NextRequest } from "next/server";
import { ObjectId, ChangeStreamDocument, WithId, Document } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");

  if (!userId || !ObjectId.isValid(userId)) {
    return new Response("Invalid user _id", { status: 400 });
  }

  const userObjId = new ObjectId(userId);

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");
  const users = db.collection("users");

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(`: connected\n\n`);
      controller.enqueue(`data: {"status":"connected"}\n\n`);

      const pipeline = [{ $match: { "documentKey._id": userObjId } }];

      const changeStream = users.watch(pipeline, {
        fullDocument: "updateLookup",
      });

      // 🔥 Keepalive ping every 15 seconds
      const keepAlive = setInterval(() => {
        controller.enqueue(`: ping\n\n`);
      }, 15_000);

      const CDN_URL = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";

      changeStream.on(
        "change",
        (change: ChangeStreamDocument<WithId<Document>>) => {
          if (
            change.operationType !== "insert" &&
            change.operationType !== "update" &&
            change.operationType !== "replace"
          ) {
            return;
          }

          const doc = change.fullDocument;
          if (!doc) return;

          const payload = {
            name: doc.name,
            userId: doc.userId,
            bio: doc.bio,
            avatar: `${CDN_URL}/avatars/${userId}.webp?t=${Date.now()}`,
          };

          controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
        }
      );

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        changeStream.close();
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}
