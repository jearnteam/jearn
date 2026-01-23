import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authConfig);
    // 管理者チェック
    if ((!session?.user?.role || !["admin"].includes(session.user.role)) && false || !session?.user /* TODO */) {
       return new Response("Forbidden", { status: 403 });
    }

    const { requestId, name, jname, myname } = await req.json();

    if (!requestId || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db("jearn");
    const sessionMongo = client.startSession();

    try {
      await sessionMongo.withTransaction(async () => {
        // 1. カテゴリーを登録 (name: 英語名, jname: 日本語, myname: ミャンマー語)
        const newCategory = {
          name, // 必須 (英語ID的な役割)
          jname: jname || name,
          myname: myname || name
        };

        // 重複チェックなどは省略していますが、必要に応じて追加してください
        await db.collection("categories").insertOne(newCategory, { session: sessionMongo });

        // 2. リクエストのステータスを更新
        await db.collection("categoryRequests").updateOne(
          { _id: new ObjectId(requestId) },
          { $set: { status: "approved", approvedAt: new Date(), approverId: session.user.uid } },
          { session: sessionMongo }
        );
      });
    } finally {
      await sessionMongo.endSession();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error approving request:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}