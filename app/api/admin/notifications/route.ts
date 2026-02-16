import { requireAdmin } from "@/lib/admin";
import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();

    const client = await clientPromise;
    const db = client.db("jearn");

    const reportsCount = await db
      .collection("reports")
      .countDocuments({ status: "pending" });

    const categoryCount = await db
      .collection("categoryRequests")
      .countDocuments({ status: "pending" });

    return NextResponse.json({
      reports: reportsCount,
      category: categoryCount,
      total: reportsCount + categoryCount,
    });
  } catch (error) {
    console.error("Notification API error:", error);
    return NextResponse.json(
      { reports: 0, category: 0, total: 0 },
      { status: 500 }
    );
  }
}
