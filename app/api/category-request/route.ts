import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig);
    if (!session?.user?.uid) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { requestedName, reason } = await req.json();

    if (!requestedName?.trim()) {
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    await db.collection("categoryRequests").insertOne({
      userId: session.user.uid,
      userName: session.user.name,
      requestedName: requestedName.trim(),
      reason: reason?.trim() || null,
      status: "pending",
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error creating category request:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}