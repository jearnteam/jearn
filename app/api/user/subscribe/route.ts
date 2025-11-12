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
    Connection: "keep-alive",
  });

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(`: connected\n\n`);
      controller.enqueue(`data: {"status":"connected"}\n\n`);

      const pipeline = [
        { $match: { "documentKey._id": new ObjectId(userId) } },
      ];
      const changeStream = users.watch(pipeline, {
        fullDocument: "updateLookup",
      });

      // ✅ Send keepalive every 15 seconds
      const keepAlive = setInterval(() => {
        controller.enqueue(`: ping\n\n`);
      }, 15_000);

      // ✅ Send updated profile fields
      changeStream.on("change", (change: any) => {
        const doc = change.fullDocument;
        if (!doc) return;

        controller.enqueue(
          `data: ${JSON.stringify({
            name: doc.name,
            bio: doc.bio,
            picture: `/api/user/avatar/${userId}?t=${Date.now()}`,
          })}\n\n`
        );
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
