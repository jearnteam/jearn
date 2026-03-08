import { getMongoClient } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function GET() {
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const usersCol = db.collection("users");

  const postsCol = db.collection("posts");

  const [totalUsers, totalPosts] = await Promise.all([
    usersCol.countDocuments(),
    postsCol.countDocuments(),
  ]);

  // 🔥 Calendar Day DAU
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const newUsersToday = await usersCol.countDocuments({
    createdAt: { $gte: startOfToday },
  });

  const dailyActiveUsers = await usersCol.countDocuments({
    lastActiveAt: { $gte: startOfToday },
  });

  return NextResponse.json({
    totalUsers,
    totalPosts,
    dailyActiveUsers,
    newUsersToday,
  });
}
