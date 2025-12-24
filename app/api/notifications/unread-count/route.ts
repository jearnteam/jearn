import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authConfig } from "@/features/auth/auth";
import { ObjectId } from "mongodb";

export async function GET() {
  const session = await getServerSession(authConfig);
  if (!session?.user?.uid) return new Response("Unauthorized", { status: 401 });

  const client = await clientPromise;
  const db = client.db("jearn");

  const count = await db.collection("notifications").countDocuments({
    userId: new ObjectId(session.user.uid),
    read: false,
  });

  return Response.json({ count });
}
