import clientPromise from "@/lib/mongodb";
import type { WithId, Document } from "mongodb";

export interface UserDoc extends Document {
  provider: "cloudflare";
  provider_id: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function upsertUser(provider_id: string, data: Partial<UserDoc>) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  const result = await db
    .collection<UserDoc>("users")
    .findOneAndUpdate(
      { provider: "cloudflare", provider_id },
      {
        $set: { ...data, updatedAt: new Date(), provider: "cloudflare", provider_id },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, returnDocument: "after" }
    );

  const user: WithId<UserDoc> | null =
    result?.value ?? (await db.collection<UserDoc>("users").findOne({ provider_id }));

  if (!user) throw new Error("Upsert failed to return user");
  return user;
}
