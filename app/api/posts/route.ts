import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { broadcastSSE } from "../stream/route";
import { ObjectId } from "mongodb";

export async function GET() {
  const client = await clientPromise;
  const db = client.db("test");
  const posts = await db.collection("posts").find().toArray();
  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const { title, content } = await req.json();
  const client = await clientPromise;
  const db = client.db("test");
  const result = await db.collection("posts").insertOne({ title, content });

  // 🔔 Broadcast newly added post to all clients
  broadcastSSE({ type: "new-post", post: { _id: result.insertedId, title, content } });

  return NextResponse.json({ success: true });
}

export async function PUT(req: Request) {
  const { id, title, content } = await req.json();
  const client = await clientPromise;
  const db = client.db("test");

  await db
    .collection("posts")
    .updateOne({ _id: new ObjectId(id) }, { $set: { title, content } });

  // 🔔 Broadcast updated post
  broadcastSSE({ type: "update-post", post: { _id: id, title, content } });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const client = await clientPromise;
  const db = client.db("test");

  await db.collection("posts").deleteOne({ _id: new ObjectId(id) });

  // 🔔 Broadcast deleted post ID
  broadcastSSE({ type: "delete-post", id });

  return NextResponse.json({ success: true });
}
