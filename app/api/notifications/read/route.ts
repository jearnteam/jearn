import clientPromise from "@/lib/mongodb";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { ObjectId } from "mongodb";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.uid) return new Response("Unauthorized", { status: 401 });

  const client = await clientPromise;
  const db = client.db("jearn");

  await db.collection("notifications").updateMany(
    { userId: new ObjectId(session.user.uid), read: false },
    { $set: { read: true } }
  );

  return Response.json({ ok: true });
}
