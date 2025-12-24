"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/follow/FollowButton";

interface Props {
  userId: string;
}

export default function ProfileUserClient({ userId }: Props) {
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const { user: currentUser } = useCurrentUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

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
          setUser(null); // show "User not found"
          return;
        }

        setUser(userData.user);

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
  }, [userId, router]);

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
   * UI states
   * ------------------------------------------- */
  if (loading) return <FullScreenLoader />;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-gray-500">
        User not found
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
            <h1 className="text-xl font-bold">{user.name || "Unnamed User"}</h1>

            <p className="text-sm text-gray-500">@{user.userId}</p>

            {user.bio && (
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                {user.bio}
              </p>
            )}
          </div>

          {/* ✅ FOLLOW BUTTON */}
          {currentUser?._id !== userId && (
            <div className="absolute top-0 right-0">
              <FollowButton targetUserId={userId} />
            </div>
          )}
        </div>

        {/* POSTS */}
        <PostList
          posts={posts}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onEdit={() => {}}
          onDelete={async () => {}}
          onUpvote={async () => ({ ok: true })}
          onAnswer={() => {}}
          scrollContainerRef={scrollRef}
        />
      </div>
    </div>
  );
}
