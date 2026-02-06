"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import Avatar from "@/components/Avatar";
import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import FullScreenLoader from "@/components/common/FullScreenLoader";

import { usePullToRefresh } from "@/features/posts/hooks/usePullToRefresh";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import FollowButton from "@/components/follow/FollowButton";
import { normalizePosts } from "@/lib/normalizePosts";
import FollowStats from "@/components/follow/FollowStats";

/* ---------------------------------------------
 * TYPES
 * ------------------------------------------- */
type ApiUser = {
  _id: string;
  userId?: string;
  name?: string;
  bio?: string;
};

type UIUser = {
  _id: string;
  userId: string;
  name: string;
  bio: string;
  picture: string;
};

type UIUserPost = Post & {
  isAdmin?: boolean;
};

/* ---------------------------------------------
 * PAGE
 * ------------------------------------------- */
export default function UserPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  /** objectId */
  const id = params.id;  

  const { user: currentUser } = useCurrentUser();

  const [user, setUser] = useState<UIUser | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const mainRef = useRef<HTMLDivElement | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ---------------------------------------------
   * LOAD USER + POSTS
   * ------------------------------------------- */
  async function loadAll() {
    setLoading(true);
    try {
      const uRes = await fetch(`/api/user/${id}`, { cache: "no-store" });
      const uData = await uRes.json();

      if (!uData.ok) {
        setUser(null);
        return;
      }

      const apiUser: ApiUser = uData.user;

      setUser({
        _id: apiUser._id,
        userId: apiUser.userId ?? "",
        name: apiUser.name ?? "Unnamed User",
        bio: apiUser.bio ?? "",
        picture: `https://cdn.jearn.site/avatars/${id}?t=${Date.now()}`,
      });

      const pRes = await fetch(`/api/posts/byUser/${id}`, {
        cache: "no-store",
      });
      const pData = await pRes.json();

      setPosts(
        normalizePosts(pData).map((p) => ({
          ...(p as UIUserPost),
          isAdmin: (p as UIUserPost).isAdmin === true,
        }))
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /* ---------------------------------------------
   * PULL TO REFRESH
   * ------------------------------------------- */
  usePullToRefresh(mainRef, async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await loadAll();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  });

  /* ---------------------------------------------
   * DELETE
   * ------------------------------------------- */
  function requestDelete(id: string) {
    setDeletePostId(id);
    setConfirmDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletePostId) return;
    try {
      setIsDeleting(true);
      await fetch(`/api/posts/${deletePostId}`, { method: "DELETE" });
      await loadAll();
    } finally {
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
      setDeletePostId(null);
    }
  }

  /* ---------------------------------------------
   * UPVOTE (HomePage-style)
   * ------------------------------------------- */
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

  /* ---------------------------------------------
   * LOADING / NOT FOUND
   * ------------------------------------------- */
  if (loading) {
    return <FullScreenLoader text={t("loadingUser")} />;
  }

  if (!user) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        {t("userNotFound") || "User not found"}
      </div>
    );
  }

  // 🔐 TS-safe non-null alias
  const safeUser = user;

  /* ---------------------------------------------
   * RENDER
   * ------------------------------------------- */
  return (
    <>
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={async (title, content, categories, tags) => {
            await fetch(`/api/posts/${editingPost._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ title, content, categories, tags }),
            });
            await loadAll();
            setEditingPost(null);
          }}
        />
      )}

      <DeleteConfirmModal
        open={confirmDeleteOpen}
        onCancel={() => {
          if (!isDeleting) {
            setConfirmDeleteOpen(false);
            setDeletePostId(null);
          }
        }}
        onConfirm={confirmDelete}
      />

      <div className="fixed inset-0 bg-white dark:bg-black overflow-hidden">
        <main
          ref={mainRef}
          className="
      absolute top-[4.3rem] left-0 right-0 bottom-0
      overflow-y-auto no-scrollbar
      pb-[calc(env(safe-area-inset-bottom,0px)+72px)]
    "
        >
          <div className="feed-container mt-10">
            {/* PROFILE HEADER */}
            <div className="flex items-start gap-4 border-b pb-4">
              <Avatar id={id} size={80} className="border" />

              <div className="flex-1 relative">
                <h1 className="text-2xl font-bold">{safeUser.name}</h1>
                <p className="text-gray-500">@{safeUser.userId}</p>

                {/* TODO: 適切な位置にスタイリング */}
                <FollowStats userId={id}/>

                {safeUser.bio && (
                  <p className="text-gray-500">{safeUser.bio}</p>
                )}

                {currentUser?._id !== id && (
                  <div className="absolute bottom-2 right-2">
                    <FollowButton targetUserId={id} />
                  </div>
                )}
              </div>
            </div>

            {/* POSTS — NO WRAPPER */}
            <PostList
              posts={posts}
              hasMore={false}
              onLoadMore={() => {}}
              onEdit={setEditingPost}
              onDelete={(id) => Promise.resolve(requestDelete(id))}
              onUpvote={upvotePost}
              onAnswer={() => {}}
              scrollContainerRef={mainRef}
            />
          </div>
        </main>
      </div>
    </>
  );
}
