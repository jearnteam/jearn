"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { PostList } from "@/components/posts";
import { usePosts } from "@/features/posts/hooks/usePosts";
import type { Post } from "@/types/post";
import { usePullToRefresh } from "@/features/posts/hooks/usePullToRefresh";

import PostFormBox from "@/components/posts/PostFormBox";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import LoadingOwl from "@/components/LoadingOwl";
import { motion } from "framer-motion";

// Show login once per new tab
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
  useShowLoginOnNewTab();

  const router = useRouter();
  const { posts, addPost, editPost, deletePost, refetch, loading } = usePosts();

  const mainRef = useRef<HTMLElement>(null!);

  const [showPostBox, setShowPostBox] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const SCROLL_KEY = "homeScrollY";

  // Read if it's a back navigation
  const isBackNavigation = (): boolean => {
    if (typeof performance === "undefined") return false;
    const nav = performance.getEntriesByType("navigation")[0] as any;
    return nav?.type === "back_forward";
  };

  // Restore scroll on browser back
  useEffect(() => {
    if (isBackNavigation()) {
      const storedY = sessionStorage.getItem(SCROLL_KEY);
      if (storedY && mainRef.current) {
        mainRef.current.scrollTo({
          top: Number(storedY),
          behavior: "instant",
        });
      }
    } else {
      sessionStorage.removeItem(SCROLL_KEY);
    }

    return () => {
      if (mainRef.current) {
        sessionStorage.setItem(SCROLL_KEY, String(mainRef.current.scrollTop));
      }
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

  // Delete-flow
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

  // Upvote call
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
      {/* ===== Modals ===== */}

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

      {/* ===== Loading Overlay ===== */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="
            fixed inset-0 z-50 flex items-center justify-center 
            bg-white/90 dark:bg-neutral-900/90
          "
        >
          <div className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300">
            <div className="w-48 h-48 flex items-center justify-center">
              <LoadingOwl />
            </div>
            <p className="text-lg font-medium mt-4">Loading posts...</p>
          </div>
        </motion.div>
      )}

      {/* ===== Main Layout ===== */}
      <div className="fixed inset-0 pt-[4.3rem]">
        <div className="h-full w-full grid grid-cols-1 lg:grid-cols-[20%_1fr_20%] bg-white dark:bg-black">
          {/* Left Sidebar */}
          <aside className="hidden lg:block bg-black text-white px-4 py-4 overflow-hidden">
            <button
              onClick={() => setShowPostBox(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg transition"
            >
              + Create Post
            </button>
          </aside>

          {/* Center */}
          <main
            ref={mainRef}
            className="
              overflow-y-auto mt-2 px-1
              pb-[calc(env(safe-area-inset-bottom,0px)+72px)]
              lg:pb-4
            "
          >
            {isRefreshing && (
              <div className="flex justify-center items-center py-2">
                <div className="animate-spin w-6 h-6 border-2 border-t-transparent border-blue-500 rounded-full"></div>
              </div>
            )}

            <PostList
  posts={posts}
  onEdit={(p) => setEditingPost(p)}
  onDelete={async (id) => requestDelete(id)}
  onUpvote={upvotePost}
  scrollContainerRef={mainRef}   // <-- ADD THIS
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

// ===== Mobile Bottom Bar =====
function MobileBottomBar({ onCreate }: { onCreate: () => void }) {
  return (
    <div
      className="
        lg:hidden fixed bottom-0 inset-x-0 z-50
        border-t border-neutral-200 dark:border-neutral-800
        bg-white/90 dark:bg-black/80 backdrop-blur
        shadow-[0_-6px_20px_rgba(0,0,0,0.12)]
        px-4 pt-2 pb-[calc(env(safe-area-inset-bottom,0px)+8px)]
      "
    >
      <div className="max-w-screen-sm mx-auto flex items-center gap-3">
        <button
          onClick={onCreate}
          className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition"
        >
          + Create Post
        </button>
      </div>
    </div>
  );
}
