import { NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");

  if (!userId) {
    return new Response("Missing user ID", { status: 400 });
  }

  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");
  const users = db.collection("users");

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  const stream = new ReadableStream({
    async start(controller) {
      // 🟢 Initial connection flush
      controller.enqueue(`: connected\n\n`);
      controller.enqueue(`data: {"status":"connected"}\n\n`);

      // 🟡 MongoDB change stream for user document
      const pipeline = [{ $match: { "documentKey._id": new ObjectId(userId) } }];
      const changeStream = users.watch(pipeline, { fullDocument: "updateLookup" });

      // 🕒 Keepalive ping every 15 seconds to keep CF happy
      const keepAlive = setInterval(() => {
        controller.enqueue(`: ping\n\n`);
      }, 15);

      // 📡 Handle change events
      changeStream.on("change", (change) => {
        if (!("fullDocument" in change) || !change.fullDocument) return;
        const doc = change.fullDocument;

        controller.enqueue(
          `data: ${JSON.stringify({
            name: doc.name,
            bio: doc.bio,
            picture: doc.picture
              ? `/api/user/avatar/${userId}?t=${Date.now()}`
              : null,
          })}\n\n`
        );
      });

      // 🧹 Cleanup when client disconnects
      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        changeStream.close();
        controller.close();
      });
    },
  });

  return new Response(stream, { headers });
}
