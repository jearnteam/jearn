import { Collection, ObjectId } from "mongodb";

/* ---------------------- AUTHOR RESOLVER ---------------------- */
export async function resolveAuthor(
    users: Collection,
    authorId?: string | null
  ): Promise<{
    name: string;
    uniqueId: string | null;
    avatarUpdatedAt: Date | null;
  }> {
    if (!authorId) {
      return {
        name: "Anonymous",
        uniqueId: null,
        avatarUpdatedAt: null,
      };
    }
  
    let user = null;
  
    if (ObjectId.isValid(authorId)) {
      user = await users.findOne(
        { _id: new ObjectId(authorId) },
        { projection: { name: 1, uniqueId: 1, avatarUpdatedAt: 1 } }
      );
    }
  
    if (!user) {
      user = await users.findOne(
        { provider_id: authorId },
        { projection: { name: 1, uniqueId: 1, avatarUpdatedAt: 1 } }
      );
    }
  
    return {
      name: user?.name ?? "Anonymous",
      uniqueId: user?.uniqueId ?? null,
      avatarUpdatedAt: user?.avatarUpdatedAt ?? null,
    };
  }