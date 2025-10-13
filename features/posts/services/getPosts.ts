import clientPromise from "@/lib/mongodb";

export async function getPosts() {
  const client = await clientPromise;
  const db = client.db("jearn");
  return db.collection("posts").find().toArray();
}
