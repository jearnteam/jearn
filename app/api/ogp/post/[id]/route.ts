// app/api/ogp/post/[id]/route.ts

import clientPromise from "@/lib/mongodb";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { resolveAuthor } from "@/lib/post/resolveAuthor";
import * as cheerio from "cheerio";

export const runtime = "nodejs";

/* --------------------------------------------------
   SERVER-SAFE TEXT EXTRACTOR
-------------------------------------------------- */
function extractPlainText(html: string, max = 160) {
  const $ = cheerio.load(html || "");

  // Remove script/style for safety
  $("script, style").remove();

  return $.text().replace(/\s+/g, " ").trim().slice(0, max);
}

/* --------------------------------------------------
   GET PREVIEW
-------------------------------------------------- */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json(
        { ok: false, error: "Invalid id" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "jearn");

    const posts = db.collection("posts");
    const users = db.collection("users");
    const references = db.collection("post_references");

    /* ---------------- FETCH POST ---------------- */
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

    if (!post) {
      return NextResponse.json(
        { ok: false, error: "Post not found" },
        { status: 404 }
      );
    }

    /* ---------------- AUTHOR SAFE ---------------- */
    let authorName = "Unknown";

    try {
      const author = await resolveAuthor(users, post.authorId);
      if (author?.name) authorName = author.name;
    } catch (e) {
      console.error("⚠️ resolveAuthor failed:", e);
    }

    /* ---------------- TEXT PREVIEW ---------------- */
    const description = extractPlainText(post.content || "", 160);

    /* ---------------- IMAGE PREVIEW ---------------- */
    const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";

    const image =
      Array.isArray(post.mediaRefs) && post.mediaRefs.length > 0
        ? `${CDN}/${post.mediaRefs[0]}`
        : null;

    /* ---------------- REFERENCE COUNT SAFE ---------------- */
    let referenceCount = 0;

    try {
      referenceCount = await references.countDocuments({
        to: new ObjectId(id),
      });
    } catch (e) {
      console.error("⚠️ reference count failed:", e);
    }

    /* ---------------- RESPONSE ---------------- */
    return NextResponse.json({
      ok: true,
      data: {
        type: "jearn-post",
        id,
        title: post.title ?? null,
        description: description || null,
        image,
        authorName,
        createdAt: post.createdAt ?? null,
        referenceCount,
      },
    });
  } catch (err) {
    console.error("❌ preview route error:", err);

    return NextResponse.json(
      { ok: false, error: "Server error" },
      { status: 500 }
    );
  }
}
