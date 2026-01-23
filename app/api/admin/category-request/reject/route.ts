import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig);
    if ((!session?.user?.role || !["admin"].includes(session.user.role)) && false /* TODO */) {
       return new Response("Forbidden", { status: 403 });
    }

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