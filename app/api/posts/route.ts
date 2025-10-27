import clientPromise from "@/lib/mongodb";
import { broadcastSSE } from "@/lib/sse";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function GET() {
  const client = await clientPromise;
  const db = client.db("jearn");
  const posts = await db.collection("posts").find().sort({ createdAt: -1 }).toArray();
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const { title, content, authorId, authorName, authorAvatar } = await req.json();
  const client = await clientPromise;
  const db = client.db("jearn");

  const newPost = {
    title,
    content,
    authorId: authorId || null,
    authorName: authorName || "Anonymous",
    authorAvatar: authorAvatar || null,
    createdAt: new Date().toISOString(),
  };

  const result = await db.collection("posts").insertOne(newPost);

  broadcastSSE({ type: "new-post", post: { _id: result.insertedId, ...newPost } });
  return NextResponse.json({ success: true });
}

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

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const client = await clientPromise;
  const db = client.db("jearn");

  await db.collection("posts").deleteOne({ _id: new ObjectId(id) });

  broadcastSSE({ type: "delete-post", id });
  return NextResponse.json({ success: true });
}
