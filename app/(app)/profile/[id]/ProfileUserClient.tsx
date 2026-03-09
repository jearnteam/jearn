"use client";

import { useEffect, useState, useCallback } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";
import Avatar from "@/components/Avatar";
import FollowButton from "@/components/follow/FollowButton";
import FollowStats from "@/components/follow/FollowStats";
import { t } from "i18next";
import { usePostInteractions } from "@/features/posts/hooks/usePostInteractions";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";

interface Props {
  userId: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onOpenRoom: (roomId: string) => void; // 🔥 NEW
}

type ApiUser = {
  _id: string;
  uniqueId: string;
  name?: string;
  bio?: string;
};

type UIUser = {
  _id: string;
  uniqueId: string;
  name: string;
  bio: string;
};

export default function ProfileUserClient({
  userId,
  scrollContainerRef,
}: Props) {
  const { user: currentUser } = useCurrentUser();
  const router = useRouter();

  const [user, setUser] = useState<UIUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  const { upvote, vote, answer } = usePostInteractions({
    setAnsweringPost: () => {},
  });

  /* ---------------- INITIAL LOAD ---------------- */

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

  /* ---------------- START CHAT (OVERLAY) ---------------- */

  async function startChat() {
    if (!currentUser || currentUser.uid === userId) return;
    if (startingChat) return;

    setStartingChat(true);

    try {
      const res = await fetch("/api/chat/room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: userId }),
      });

      if (!res.ok) {
        console.error("Failed to create/open chat");
        return;
      }

      const { roomId } = await res.json();

      // 🔥 Close overlay FIRST
      router.back();

      // 🔥 Then open chat after small delay
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("chat:open", {
            detail: { roomId },
          })
        );
      }, 50);
    } finally {
      setStartingChat(false);
    }
  }

  /* ---------------- LOAD MORE ---------------- */

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

  /* ---------------- UI ---------------- */

  if (loading) return <FullScreenLoader />;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[60vh] text-gray-500">
        {t("profilePage.userNotFound")}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black min-h-screen">
      <div className="feed-container">
        {/* PROFILE HEADER */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mt-4">
            {/* Left side */}
            <div className="flex flex-col items-center sm:items-start gap-4 flex-1">
              {/* Avatar + Name */}
              <div className="flex items-center gap-4">
                <Avatar id={userId} size={72} className="border shrink-0" />

                <div className="text-left">
                  <h1 className="text-xl font-bold break-words">{user.name}</h1>
                  <p className="text-sm text-gray-500 break-all">
                    @{user.uniqueId}
                  </p>
                </div>
              </div>

              {/* Mobile Buttons */}
              <div className="flex gap-2 sm:hidden justify-center">
                <FollowButton targetUserId={userId} />

                {currentUser?.uid !== userId && (
                  <button
                    onClick={startChat}
                    disabled={startingChat}
                    className="
              px-4 py-2 rounded-full
              bg-blue-600 text-white
              text-sm font-medium
              disabled:opacity-50 gap-2
            "
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle size={16} />
                      {startingChat ? "Opening…" : "Chat"}
                    </div>
                  </button>
                )}
              </div>

              {/* Stats */}
              <div className="mt-1">
                <FollowStats userId={userId} />
              </div>

              {/* Bio */}
              {user.bio && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 max-w-md text-center sm:text-left">
                  {user.bio}
                </p>
              )}
            </div>

            {/* Desktop Buttons */}
            <div className="hidden sm:flex gap-2">
              <FollowButton targetUserId={userId} />

              {currentUser?.uid !== userId && (
                <button
                  onClick={startChat}
                  disabled={startingChat}
                  className="
            px-4 py-2 rounded-full
            bg-blue-600 text-white
            text-sm font-medium
            disabled:opacity-50
          "
                >
                  {startingChat ? "Opening…" : "Chat"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* POSTS */}
        <PostList
          posts={posts}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onUpvote={upvote}
          onVote={vote}
          onAnswer={answer}
          scrollContainerRef={scrollContainerRef}
        />
      </div>
    </div>
  );
}
