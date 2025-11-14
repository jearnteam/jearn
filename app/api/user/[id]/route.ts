import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(id) },
      { projection: { name: 1, bio: 1, picture: 1 } }
    );

    if (!user)
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      user: {
        uid: id,
        name: user.name ?? "Anonymous",
        bio: user.bio ?? "",
        picture: user.picture ? `/api/user/avatar/${id}` : null,
      },
    });
  } catch (err) {
    console.error("Error in /api/user/[id]:", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
