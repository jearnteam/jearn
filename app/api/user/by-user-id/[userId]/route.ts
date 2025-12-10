// app/api/user/by-user-id/[userId]/route.ts
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(
  _req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const raw = params.userId?.trim();
    if (!raw) {
      return NextResponse.json(
        { ok: false, error: "Missing userId" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    let user = null;

    /* ----------------------------------------
     * 1) Try lookup by userId
     * ---------------------------------------- */
    user = await db.collection("users").findOne(
      { userId: raw },
      {
        projection: {
          _id: 1,
          name: 1,
          userId: 1,
          bio: 1,
          picture: 1,
        },
      }
    );

    /* ----------------------------------------
     * 2) If not found, try lookup by _id (UID)
     * ---------------------------------------- */
    if (!user) {
      try {
        user = await db.collection("users").findOne(
          { _id: new ObjectId(raw) },
          {
            projection: {
              _id: 1,
              name: 1,
              userId: 1,
              bio: 1,
              picture: 1,
            },
          }
        );
      } catch {
        // raw wasn't a valid ObjectId → ignore
      }
    }

    /* ----------------------------------------
     * 3) Still not found?
     * ---------------------------------------- */
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      user: {
        uid: user._id.toString(),
        name: user.name ?? "Unknown User",
        userId: user.userId ?? null,
        bio: user.bio ?? "",
        picture: user.picture
          ? `/api/user/avatar/${user._id.toString()}`
          : null,
      },
    });
  } catch (err) {
    console.error("Error in /api/user/by-user-id:", err);
    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
