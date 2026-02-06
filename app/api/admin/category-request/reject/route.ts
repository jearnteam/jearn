import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { requireAdmin } from "@/lib/admin";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const { requestId } = await req.json();

    const client = await clientPromise;
    const db = client.db("jearn");

    await db.collection("categoryRequests").updateOne(
      { _id: new ObjectId(requestId) },
      { $set: { status: "rejected", rejectedAt: new Date() } }
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}