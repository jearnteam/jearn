import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const postsCollection = db.collection("posts");

    /* ---------------- 基本統計 ---------------- */

    const totalPosts = await postsCollection.countDocuments({
      parentId: null,
      replyTo: null,
    });

    const totalComments = await postsCollection.countDocuments({
      parentId: { $ne: null },
      replyTo: null,
    });

    const totalReplies = await postsCollection.countDocuments({
      replyTo: { $ne: null },
    });

    /* ---------------- 日別投稿 ---------------- */

    const dailyAgg = await postsCollection
      .aggregate([
        {
          $match: {
            createdAt: { $gte: last30Days },
            parentId: null,
            replyTo: null,
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    const dailyPosts = dailyAgg.map((d) => ({
      date: d._id,
      count: d.count,
    }));

    /* ---------------- カテゴリー ---------------- */

    const categoryAgg = await postsCollection
      .aggregate([
        {
          $match: {
            parentId: null,
            replyTo: null,
          },
        },
        { $unwind: "$categories" },
        {
          $group: {
            _id: "$categories",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ])
      .toArray();

    const categories = categoryAgg.map((c) => ({
      name: c._id,
      count: c.count,
    }));

    /* ---------------- タグ統計 ---------------- */

    const tagAgg = await postsCollection
      .aggregate([
        { $unwind: "$tags" },
        {
          $group: {
            _id: "$tags",
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ])
      .toArray();

    const tagStats = tagAgg.map((t) => ({
      name: t._id,
      count: t.count,
    }));

    return NextResponse.json({
      totalPosts,
      totalComments,
      totalReplies,
      dailyPosts,
      categories,
      tagStats,
    });
  } catch (error) {
    console.error("Analytics API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
