import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const user_id = searchParams.get("id");

  if (!user_id) {
    return new Response("Missing user _id", { status: 400 });
  }

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

      const pipeline = [
        { $match: { "documentKey._id": new ObjectId(user_id) } },
      ];

      const changeStream = users.watch(pipeline, {
        fullDocument: "updateLookup",
      });

      // 🔥 Keepalive ping every 15 seconds
      const keepAlive = setInterval(() => {
        controller.enqueue(`: ping\n\n`);
      }, 15_000);

      // 🔥 Avatar CDN URL (no more MongoDB avatar)
      const CDN_URL = process.env.R2_PUBLIC_URL; // e.g., https://cdn.jearn.site

      changeStream.on("change", (change: any) => {
        const doc = change.fullDocument;
        if (!doc) return;

        const payload = {
          name: doc.name,
          userId: doc.userId,
          bio: doc.bio,
          // 🔥 CDN avatar with cache-busting query
          avatar: `${CDN_URL}/avatars/${user_id}.webp?t=${Date.now()}`,
        };

        controller.enqueue(`data: ${JSON.stringify(payload)}\n\n`);
      });

      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        changeStream.close();
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}
