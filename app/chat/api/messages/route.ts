import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { broadcastSSE } from "../stream/route";
import { ObjectId } from "mongodb";

export async function GET() {
  const client = await clientPromise;
  const db = client.db("jearn");
  const messages = await db.collection("messages").find().sort({ _id: 1 }).toArray();
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const { name, text } = await req.json();
  const client = await clientPromise;
  const db = client.db("jearn");

  const message = { name, text, createdAt: new Date() };
  const result = await db.collection("messages").insertOne(message);
  const savedMessage = { ...message, _id: result.insertedId };

  broadcastSSE({ type: "new-message", message: savedMessage });
  return NextResponse.json({ success: true });
}

export async function PUT(req: Request) {
  const { id, text } = await req.json();
  const client = await clientPromise;
  const db = client.db("jearn");

  await db.collection("messages").updateOne(
    { _id: new ObjectId(id) },
    { $set: { text } }
  );

  const updatedMessage = await db.collection("messages").findOne({ _id: new ObjectId(id) });
  broadcastSSE({ type: "update-message", message: updatedMessage });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  const client = await clientPromise;
  const db = client.db("jearn");

  await db.collection("messages").deleteOne({ _id: new ObjectId(id) });
  broadcastSSE({ type: "delete-message", id });
  return NextResponse.json({ success: true });
}
