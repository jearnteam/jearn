import clientPromise from "@/lib/mongodb";
import type { WithId, Document, Binary } from "mongodb";

export interface UserDoc extends Document {
  provider: "cloudflare";
  provider_id: string;
  email?: string;
  name?: string;
  picture?: Binary;
  bio?: string;
  email_verified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export async function upsertUser(provider_id: string, data: Partial<UserDoc>) {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB || "jearn");

  // ✅ Filter out undefined values and add updatedAt
  const updateFields: Partial<UserDoc> = {
    provider: "cloudflare",
    provider_id,
    updatedAt: new Date(),
  };

  // Only update some fields if provided (e.g., email, email_verified)
  if (data.email !== undefined) updateFields.email = data.email;
  if (data.email_verified !== undefined)
    updateFields.email_verified = data.email_verified;

  // ⚠️ Do NOT auto-update name or picture every login (DB is the source of truth)
  // if (data.name !== undefined) updateFields.name = data.name;
  // if (data.picture !== undefined) updateFields.picture = data.picture;

  const result = await db
    .collection<UserDoc>("users")
    .findOneAndUpdate(
      { provider: "cloudflare", provider_id },
      {
        $set: updateFields,
        $setOnInsert: {
          createdAt: new Date(),
          bio: "",
          name: data.name,           // Set name ONLY on insert (first login)
          picture: data.picture,     // Same for picture
        },
      },
      { upsert: true, returnDocument: "after" }
    );

  const user: WithId<UserDoc> | null =
    result?.value ??
    (await db.collection<UserDoc>("users").findOne({ provider_id }));

  if (!user) throw new Error("Upsert failed to return user");
  return user;
}
