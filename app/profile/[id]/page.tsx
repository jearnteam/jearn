"use client";

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

import Avatar from "@/components/Avatar";
import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import LoadingOwl from "@/components/LoadingOwl";

import { motion } from "framer-motion";
import { usePullToRefresh } from "@/features/posts/hooks/usePullToRefresh";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import FullScreenLoader from "@/components/common/FullScreenLoader";

export default function UserPage({ params }: any) {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = use(params) as { id: string };

  // Current logged-in user
  const { user: currentUser, loading: currentUserLoading } = useCurrentUser();

  // Redirect if viewing your own profile
  useEffect(() => {
    if (!currentUserLoading && currentUser?._id === id) {
      router.replace("/profile");
    }
  }, [currentUserLoading, currentUser, id]);

  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const mainRef = useRef<HTMLDivElement | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /* ------------------------------------------------------
    Fetch posts + user info
  ------------------------------------------------------ */
  async function loadAll() {
    setLoading(true);

    try {
      // Fetch user
      const uRes = await fetch(`/api/user/${id}`, { cache: "no-store" });
      const uData = await uRes.json();

      if (!uData.ok) {
        setUser(null);
        return;
      }

      setUser({
        ...uData.user,
        picture: `https://cdn.jearn.site/avatars/${id}?t=${new Date().getTime()}`,
      });

      // Fetch posts
      const pRes = await fetch(`/api/posts/byUser/${id}`, {
        cache: "no-store",
      });
      const pData = await pRes.json();

      const cleaned = (pData.posts || []).map((x: any) => ({
        ...x,
        isAdmin: x.isAdmin === true,
      }));

      setPosts(cleaned);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [id]);

  /* ------------------------------------------------------
    Pull to refresh
  ------------------------------------------------------ */
  usePullToRefresh(mainRef, async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await loadAll();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  });

  /* ------------------------------------------------------
    Post actions (same as HomePage)
  ------------------------------------------------------ */
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

  async function upvotePost(id: string, userId: string) {
    const res = await fetch(`/api/posts/${id}/upvote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    return res.ok
      ? { ok: true, action: data.action }
      : { ok: false, error: data.error || "Upvote failed" };
  }

  /* ------------------------------------------------------
    Loading UI
  ------------------------------------------------------ */
  if (loading) return <FullScreenLoader text={t("loadingUser")} />;

  if (!user)
    return (
      <div className="fixed inset-0 flex justify-center items-center">
        {t("userNotFound") || "User not found."}
      </div>
    );

  /* ------------------------------------------------------
    Page
  ------------------------------------------------------ */
  return (
    <>
      {/* Edit Modal */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={async (title, content, categories, tags) => {
            await fetch(`/api/posts/${editingPost._id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title,
                content,
                categories,
                tags,
              }),
            });

            await loadAll(); // reload user posts
            setEditingPost(null);
          }}
        />
      )}

      {/* Delete Modal */}
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

      <div className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
        <div className="w-full h-screen overflow-hidden">
          {/* LEFT SIDEBAR */}
          <aside
            className="
      hidden xl:flex flex-col 
      fixed top-[4.3rem] left-0 
      w-[320px] 
      h-[calc(100vh-4.3rem)] 
      bg-black text-white 
      px-4 py-4 
      border-r border-neutral-800 
      overflow-y-auto no-scrollbar
    "
          >
            <p className="opacity-70">Profile Menu</p>
          </aside>

          {/* RIGHT SIDEBAR */}
          <aside
            className="
      hidden xl:flex flex-col 
      fixed top-[4.3rem] right-0 
      w-[320px] 
      h-[calc(100vh-4.3rem)] 
      bg-black text-white 
      px-4 py-4 
      border-l border-neutral-800 
      overflow-y-auto no-scrollbar
    "
          >
            <p>Related</p>
          </aside>

          {/* MAIN CONTENT */}
          <main
            ref={mainRef}
            className="
        absolute top-[4.3rem] 
        left-0 right-0 
        xl:left-[320px] xl:right-[320px]
        h-[calc(100vh-4.3rem)]
        overflow-y-auto no-scrollbar
        pb-[calc(env(safe-area-inset-bottom,0px)+72px)]
        px-3 md:px-6
      "
          >
            {/* Header */}
            <div className="max-w-2xl mx-auto py-6 space-y-8">
              <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-300 dark:border-gray-700">
                <Avatar id={id} size={80} className="border" />

                <div>
                  <h1 className="text-2xl font-bold">{user.name}</h1>
                  <h2 className="text-gray-600 dark:text-gray-400">
                    {user.userId ? "@" + user.userId : ""}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">{user.bio}</p>
                </div>
              </div>

              <h2 className="text-xl font-semibold">
                {t("postsByBefore") || "Posts by"} {user.name}
              </h2>

              {/* POSTS */}
              <PostList
                posts={posts}
                onEdit={(p) => setEditingPost(p)}
                onDelete={(id) => Promise.resolve(requestDelete(id))}
                onUpvote={upvotePost}
                scrollContainerRef={mainRef}
              />

              {isRefreshing && (
                <div className="flex justify-center items-center py-4">
                  <div className="animate-spin w-6 h-6 border-2 border-t-transparent border-blue-500 rounded-full"></div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
