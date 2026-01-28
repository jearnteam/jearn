import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authConfig);
    // 簡易的な管理者チェック (実際にはロールチェック等を推奨)
    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
       return new Response("Forbidden", { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db("jearn");

    const requests = await db
      .collection("categoryRequests")
      .find({ status: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(requests);
  } catch (error) {
    console.error("Error fetching category requests:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}