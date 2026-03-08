// lib/posts/buildFeedResponse.ts

import { ObjectId, Collection, WithId } from "mongodb";
import { PostTypes, RawPost } from "@/types/post";

type CategoryDoc = {
  _id: ObjectId;
  name?: string;
  jname?: string;
  myname?: string;
};

type UserDoc = {
  _id: ObjectId;
  name?: string;
  uniqueId?: string;
  avatarUpdatedAt?: Date | null;
};

export async function buildFeedResponse(
  docs: WithId<RawPost>[],
  {
    usersColl,
    categoriesColl,
    viewerId,
    postsColl,
  }: {
    usersColl: Collection<UserDoc>;
    categoriesColl: Collection<CategoryDoc>;
    viewerId?: string | null;
    postsColl: Collection<RawPost>; // ✅ FIX HERE
  }
) {
  const CDN = process.env.R2_PUBLIC_URL || "https://cdn.jearn.site";

  /* ---------------- Author cache (avoid N+1) ---------------- */
  const authorIds = [...new Set(docs.map((d) => d.authorId).filter(Boolean))];

  const users = await usersColl
    .find({ _id: { $in: authorIds.map((id) => new ObjectId(id)) } })
    .project({ name: 1, uniqueId: 1, avatarUpdatedAt: 1 })
    .toArray();

  const userMap = new Map(users.map((u) => [u._id.toString(), u]));

  /* ---------------- Categories batch ---------------- */
  const allCategoryIds = [
    ...new Set(
      docs
        .flatMap((d) => d.categories ?? [])
        .filter((id) => ObjectId.isValid(id))
        .map((id) => id.toString())
    ),
  ];

  const categoryDocs = await categoriesColl
    .find({ _id: { $in: allCategoryIds.map((id) => new ObjectId(id)) } })
    .toArray();

  const categoryMap = new Map(
    categoryDocs.map((c) => [
      c._id.toString(),
      {
        id: c._id.toString(),
        name: c.name,
        jname: c.jname,
        myname: c.myname ?? "",
      },
    ])
  );

  /* ---------------- Parent posts for answers ---------------- */
  const parentIds = [
    ...new Set(
      docs
        .filter(
          (d): d is WithId<RawPost> & { parentId: string } =>
            d.postType === PostTypes.ANSWER &&
            typeof d.parentId === "string" &&
            ObjectId.isValid(d.parentId)
        )
        .map((d) => d.parentId)
    ),
  ];

  const parentMap = new Map<string, any>();

  if (parentIds.length > 0) {
    const parentDocs = await postsColl
      .find({ _id: { $in: parentIds.map((id) => new ObjectId(id)) } })
      .toArray();

    for (const parent of parentDocs) {
      const parentUser = userMap.get(parent.authorId);

      const avatarTs = parentUser?.avatarUpdatedAt
        ? `?t=${new Date(parentUser.avatarUpdatedAt).getTime()}`
        : "";

      const authorAvatar = `${CDN}/avatars/${parent.authorId}.webp${avatarTs}`;

      parentMap.set(parent._id.toString(), {
        _id: parent._id.toString(),
        postType: parent.postType,
        parentId: parent.parentId ?? null,
        title: parent.title,
        content: parent.content,
        createdAt: parent.createdAt,
        authorId: parent.authorId,
        authorName: parentUser?.name ?? "Unknown",
        authorUniqueId: parentUser?.uniqueId,
        authorAvatar,
        categories: (parent.categories ?? [])
          .map((id: any) => categoryMap.get(id.toString()))
          .filter(Boolean),
        tags: parent.tags ?? [],
        commentDisabled: parent.commentDisabled ?? false,
      });
    }
  }

  /* ---------------- Comment counts (page scoped) ---------------- */

  const postIds = docs.map((d) => d._id.toString());

  const commentCounts = await postsColl
    .aggregate([
      { $match: { parentId: { $in: postIds } } },
      { $group: { _id: "$parentId", count: { $sum: 1 } } },
    ])
    .toArray();

  const countMap = new Map<string, number>();
  commentCounts.forEach((c: any) => {
    countMap.set(c._id.toString(), c.count);
  });

  /* ---------------- Final shaping ---------------- */

  return await Promise.all(
    docs.map(async (p) => {
      const user = userMap.get(p.authorId);

      const avatarTs = user?.avatarUpdatedAt
        ? `?t=${new Date(user.avatarUpdatedAt).getTime()}`
        : "";

      const authorAvatar = `${CDN}/avatars/${p.authorId}.webp${avatarTs}`;

      const poll = p.poll
        ? {
            ...p.poll,
            votedOptionIds: viewerId
              ? Array.isArray(p.poll.votes?.[viewerId])
                ? p.poll.votes[viewerId]
                : typeof p.poll.votes?.[viewerId] === "string"
                ? [p.poll.votes[viewerId]]
                : []
              : [],
          }
        : undefined;

      return {
        _id: p._id.toString(),
        postType: p.postType,
        parentId: p.parentId ?? null,
        title: p.title,
        content: p.content,
        poll,
        video: p.video ?? undefined,
        references: p.references ?? [],
        isAdmin: p.isAdmin ?? false,
        commentDisabled: p.commentDisabled ?? false,

        createdAt: p.createdAt,
        edited: p.edited ?? false,
        editedAt: p.editedAt ?? null,

        authorId: p.authorId,
        authorName: user?.name ?? "Unknown",
        authorUniqueId: user?.uniqueId,
        authorAvatar,

        categories: (p.categories ?? [])
          .map((id: any) => categoryMap.get(id.toString()))
          .filter(Boolean),

        tags: p.tags ?? [],
        mediaRefs: p.mediaRefs ?? [],
        upvoteCount: p.upvoteCount ?? 0,
        upvoters: p.upvoters ?? [],
        commentCount: countMap.get(p._id.toString()) ?? 0,

        parentPost:
          p.postType === PostTypes.ANSWER && p.parentId
            ? parentMap.get(p.parentId.toString())
            : undefined,
      };
    })
  );
}
