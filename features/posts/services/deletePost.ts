import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { broadcastSSE } from "@/lib/sse";

export async function deletePost(id: string) {
  const client = await clientPromise;
  const db = client.db("jearn");

  await db.collection("posts").deleteOne({ _id: new ObjectId(id) });

  broadcastSSE({ type: "delete-post", id });
  return { success: true };
}
