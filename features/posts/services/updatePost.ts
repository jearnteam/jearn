import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { broadcastSSE } from "@/lib/sse";

export async function updatePost(id: string, title: string, content: string) {
  const client = await clientPromise;
  const db = client.db("jearn");

  await db.collection("posts").updateOne(
    { _id: new ObjectId(id) },
    { $set: { title, content } }
  );

  const updated = { _id: id, title, content };
  broadcastSSE({ type: "update-post", post: updated });
  return updated;
}
