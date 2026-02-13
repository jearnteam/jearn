// app/api/ogp/post/[id]/route.ts
import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { resolveAuthor } from "@/lib/post/resolveAuthor"; // or extract to shared util
import { extractTextWithMath } from "@/lib/processText";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(null, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const posts = db.collection("posts");
    const users = db.collection("users");

    const post = await posts.findOne(
      { _id: new ObjectId(id) },
      {
        projection: {
          title: 1,
          content: 1,
          authorId: 1,
          createdAt: 1,
          mediaRefs: 1,
        },
      }
    );

    if (!post) return NextResponse.json(null, { status: 404 });

    const author = await resolveAuthor(users, post.authorId);

    // extract short text preview (strip html + math)
    const text = extractTextWithMath(post.content || "")
      .replace(/\s+/g, " ")
      .slice(0, 160);

    const preview = {
      type: "jearn-post",
      id: post._id.toString(),
      title: post.title ?? null,
      description: text || null,
      image: post.mediaRefs?.[0] ?? null,
      authorName: author.name,
      createdAt: post.createdAt ?? null,
    };

    return NextResponse.json(preview);
  } catch (err) {
    console.error("❌ preview route:", err);
    return NextResponse.json(null, { status: 500 });
  }
}
