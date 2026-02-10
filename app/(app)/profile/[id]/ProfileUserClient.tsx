"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/follow/FollowButton";
import FollowStats from "@/components/follow/FollowStats";
import { t } from "i18next";

interface Props {
  userId: string;
}

type ApiUser = {
  _id: string;
  uniqueId: string;
  name?: string;
  bio?: string;
  picture?: string;
};

type UIUser = {
  _id: string;
  uniqueId: string;
  name: string;
  bio: string;
};

async function upvotePost(id: string): Promise<void> {
  const res = await fetch(`/api/posts/${id}/upvote`, {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) return;

  const data = await res.json();

  if (data.action === "added" && data.authorId) {
    fetch("/api/notifications/emit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: data.authorId,
        payload: {
          type: "post_like",
          postId: id,
        },
      }),
    }).catch(() => {});
  }
}

export default function ProfileUserClient({ userId }: Props) {
  const { user: currentUser } = useCurrentUser();

  const [user, setUser] = useState<UIUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  /** ✅ THIS is the scroll container used by PostList */
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* ---------------------------------------------
   * Initial load
   * ------------------------------------------- */
  useEffect(() => {
    if (!userId) return;

    (async () => {
      try {
        const userRes = await fetch(`/api/user/${userId}`, {
          cache: "no-store",
        });

        const userData = await userRes.json();
        if (!userData.ok) {
          setUser(null);
          return;
        }

        const apiUser: ApiUser = userData.user;

        setUser({
          _id: apiUser._id,
          uniqueId: apiUser.uniqueId,
          name: apiUser.name ?? "Unnamed User",
          bio: apiUser.bio ?? "",
        });

        const postRes = await fetch(`/api/posts/byUser/${userId}?limit=10`, {
          cache: "no-store",
        });

        const postData = await postRes.json();

        setPosts(postData.posts ?? []);
        setCursor(postData.nextCursor ?? null);
        setHasMore(!!postData.nextCursor);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  /* ---------------------------------------------
   * Load more (infinite scroll)
   * ------------------------------------------- */
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;

    setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/posts/byUser/${userId}?limit=10&cursor=${cursor}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      setPosts((prev) => [...prev, ...(data.posts ?? [])]);
      setCursor(data.nextCursor ?? null);
      setHasMore(!!data.nextCursor);
    } finally {
      setLoadingMore(false);
    }
  }, [cursor, hasMore, loadingMore, userId]);

  /* ---------------------------------------------
   * UI
   * ------------------------------------------- */
  if (loading) return <FullScreenLoader />;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-gray-500">
        {t("profilePage.userNotFound")}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black min-h-screen pb-24">
      <div className="feed-container mt-10">
        {/* PROFILE HEADER */}
        <div className="flex items-start gap-5 mb-8 relative">
          <Avatar id={userId} size={80} className="border" />

          <div className="flex-1">
            <h1 className="text-xl font-bold">{user.name}</h1>
            <p className="text-sm text-gray-500">@{user.uniqueId}</p>

            <FollowStats userId={userId} />
            {user.bio && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                {user.bio}
              </p>
            )}
          </div>

          <FollowButton targetUserId={userId} />
        </div>

        {/* POSTS — NO WRAPPER */}
        <PostList
          posts={posts}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onEdit={() => {}}
          onDelete={async () => {}}
          onUpvote={upvotePost}
          onAnswer={() => {}}
          /* no scrollContainerRef */
        />
      </div>
    </div>
  );
}
