import clientPromise from "@/lib/mongodb";
import { broadcastSSE } from "@/lib/sse";

export async function createPost(title: string, content: string) {
  const client = await clientPromise;
  const db = client.db("jearn");

  const result = await db.collection("posts").insertOne({ title, content });
  const post = { _id: result.insertedId, title, content };

  // 🔔 Notify connected clients
  broadcastSSE({ type: "new-post", post });

  return post;
}
