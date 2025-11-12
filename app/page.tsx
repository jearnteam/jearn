"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PostList } from "@/components/posts";
import { usePosts } from "@/features/posts/hooks/usePosts";
import type { Post } from "@/types/post";
import { usePullToRefresh } from "@/features/posts/hooks/usePullToRefresh";

import PostFormBox from "@/components/posts/PostFormBox";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import LoadingOwl from "@/components/LoadingOwl";
import { motion } from "framer-motion";

// 🧠 Hook: redirect to /login once per new tab
function useShowLoginOnNewTab() {
  const router = useRouter();

  useEffect(() => {
    const visited = sessionStorage.getItem("visited");
    if (!visited) {
      sessionStorage.setItem("visited", "true");
      router.replace("/login");
    }
  }, [router]);
}

export default function HomePage() {
  useShowLoginOnNewTab(); // 🔹 show login once per tab

  const router = useRouter();
  const searchParams = useSearchParams();
  const { posts, addPost, editPost, deletePost, refetch, loading } = usePosts();

  const mainRef = useRef<HTMLElement | null>(null);
  const [showPostBox, setShowPostBox] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // Scroll restore
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const SCROLL_KEY = "homeScrollY";

  const saveScrollY = () => {
    if (mainRef.current) {
      sessionStorage.setItem(SCROLL_KEY, String(mainRef.current.scrollTop));
    }
  };

  const restoreScrollY = () => {
    const storedY = sessionStorage.getItem(SCROLL_KEY);
    if (storedY && mainRef.current) {
      mainRef.current.scrollTo({ top: Number(storedY), behavior: "instant" });
    }
  };

  const isBackNavigation = (): boolean => {
    const navEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    return navEntry?.type === "back_forward";
  };

  useEffect(() => {
    if (isBackNavigation()) {
      restoreScrollY();
    } else {
      sessionStorage.removeItem(SCROLL_KEY);
    }

    return () => {
      saveScrollY();
    };
  }, []);

  // Pull-to-refresh
  usePullToRefresh(mainRef, async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  });

  // Delete logic
  function requestDelete(id: string) {
    setDeletePostId(id);
    setConfirmDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deletePostId) return;
    try {
      setIsDeleting(true);
      await deletePost(deletePostId);
    } finally {
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
      setDeletePostId(null);
    }
  }

  // Upvote
  async function upvotePost(
    id: string,
    userId: string
  ): Promise<{ ok: boolean; error?: string; action?: "added" | "removed" }> {
    try {
      const res = await fetch(`/api/posts/${id}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || "Upvote failed" };
      return { ok: true, action: data.action };
    } catch (err) {
      console.error("❌ Upvote error:", err);
      return { ok: false, error: "Network error" };
    }
  }

  return (
    <>
      {/* ======== MODALS ======== */}
      <PostFormBox
        open={showPostBox}
        onClose={() => setShowPostBox(false)}
        onSubmit={addPost}
      />

      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={async (title, content) => {
            await editPost(editingPost._id, title, content);
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

      {/* ====== LOADING OVERLAY ====== */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center 
                     bg-white/90 dark:bg-neutral-900/90 transition-colors"
        >
          <div className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300">
            <div className="w-48 h-48 flex items-center justify-center">
              <LoadingOwl />
            </div>
            <p className="text-lg font-medium mt-4">Loading posts...</p>
          </div>
        </motion.div>
      )}

      {/* ====== LAYOUT ====== */}
      <div className="fixed inset-0 pt-[4.3rem]">
        <div
          className="
            h-full w-full
            grid grid-cols-1
            lg:grid-cols-[20%_1fr_20%]
            bg-white dark:bg-black
          "
        >
          {/* Left Sidebar */}
          <aside className="hidden lg:block bg-black text-white px-4 py-4 overflow-hidden">
            <button
              onClick={() => setShowPostBox(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg transition"
            >
              + Create Post
            </button>
          </aside>

          {/* Center Content */}
          <main
            ref={mainRef}
            className="
              overflow-y-auto
              pb-[calc(env(safe-area-inset-bottom,0px)+72px)]
              lg:pb-4 px-1
            "
          >
            {/* Pull-to-refresh indicator */}
            {isRefreshing && (
              <div className="flex justify-center items-center py-2">
                <div className="animate-spin w-6 h-6 border-2 border-t-transparent border-blue-500 rounded-full"></div>
              </div>
            )}

            <PostList
              posts={posts}
              onEdit={(post) => setEditingPost(post)}
              onDelete={async (id) => {
                requestDelete(id);
              }}
              onUpvote={upvotePost}
            />
          </main>

          {/* Right Sidebar */}
          <aside className="hidden lg:block bg-black text-white px-4 py-4 overflow-hidden">
            <p>Right Content (fixed)</p>
          </aside>
        </div>

        {/* Mobile bottom bar */}
        {!showPostBox && (
          <MobileBottomBar onCreate={() => setShowPostBox(true)} />
        )}
      </div>
    </>
  );
}

// ====== Mobile Bottom Bar ======
function MobileBottomBar({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="
        lg:hidden
        fixed bottom-0 inset-x-0
        z-50
        border-t border-neutral-200 dark:border-neutral-800
        bg-white/90 dark:bg-black/80
        backdrop-blur
        shadow-[0_-6px_20px_rgba(0,0,0,0.12)]
        px-4 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]
      "
      role="toolbar"
      aria-label="Mobile actions"
    >
      <div className="max-w-screen-sm mx-auto flex items-center gap-3">
        <button
          onClick={onCreate}
          className="
            flex-1
            h-12
            rounded-xl
            bg-blue-600 hover:bg-blue-700 active:bg-blue-800
            text-white font-medium
            transition
          "
          aria-label="Create Post"
        >
          + Create Post
        </button>
      </div>
    </div>
  );
}
