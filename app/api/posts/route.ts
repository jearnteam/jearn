import clientPromise from "@/lib/mongodb";          // ✅ MongoDB connection
import { broadcastSSE } from "@/lib/sse";           // ✅ SSE helper
import { NextResponse } from "next/server";        // ✅ Response helper
import { ObjectId } from "mongodb";                // ✅ For updating/deleting

// 🟢 GET all posts
export async function GET() {
  const client = await clientPromise;
  const db = client.db("jearn");
  const posts = await db.collection("posts").find().toArray();
  return NextResponse.json(posts);
}

// 🟢 CREATE a post
export async function POST(req: Request) {
  const { title, content, author } = await req.json();
  const client = await clientPromise;
  const db = client.db("jearn");

  const newPost = {
    title,
    content,
    author: author || "Anonymous",
    createdAt: new Date().toISOString(),
  };

  const result = await db.collection("posts").insertOne(newPost);

  // 📡 Broadcast to clients using SSE
  broadcastSSE({
    type: "new-post",
    post: { _id: result.insertedId, ...newPost },
  });

  return NextResponse.json({ success: true });
}

// 🟡 UPDATE a post
export async function PUT(req: Request) {
  const { id, title, content } = await req.json();
  const client = await clientPromise;
  const db = client.db("jearn");

  const updatedFields: Record<string, string> = {};
  if (title) updatedFields.title = title;
  if (content) updatedFields.content = content;

  await db.collection("posts").updateOne(
    { _id: new ObjectId(id) },
    { $set: updatedFields }
  );

  broadcastSSE({ type: "update-post", post: { _id: id, ...updatedFields } });

  return NextResponse.json({ success: true });
}

// 🔴 DELETE a post
export async function DELETE(req: Request) {
  const { id } = await req.json();
  const client = await clientPromise;
  const db = client.db("jearn");

  await db.collection("posts").deleteOne({ _id: new ObjectId(id) });

  broadcastSSE({ type: "delete-post", id });

  return NextResponse.json({ success: true });
}
