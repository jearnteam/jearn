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

interface UpvoteResponse {
  ok: boolean;
  error?: string;
  action?: "added" | "removed";
}

export default function HomePage() {
  useShowLoginOnNewTab();

  const { posts, addPost, editPost, deletePost, refetch, loading } = usePosts();

  const mainRef = useRef<HTMLDivElement | null>(null);

  const [showPostBox, setShowPostBox] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);

  usePullToRefresh(mainRef, async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  });

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

  async function upvotePost(
    id: string,
    userId: string
  ): Promise<UpvoteResponse> {
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

  // 🔥 STRICT POST RESTORE
  useEffect(() => {
    const targetPostId = sessionStorage.getItem("scrollToPost");
    if (!targetPostId) return;

    const tryScroll = () => {
      const el = document.getElementById(`post-${targetPostId}`);
      if (el) {
        el.scrollIntoView({ behavior: "instant", block: "start" });
        sessionStorage.removeItem("scrollToPost");
        return true;
      }
      return false;
    };

    // Try immediately
    if (tryScroll()) return;

    // Fallback: wait for infinite scroll to load
    const observer = new MutationObserver(() => {
      if (tryScroll()) observer.disconnect();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [posts]);

  return (
    <>
      {/* Modals */}
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

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/90 dark:bg-neutral-900/90"
        >
          <div className="flex flex-col items-center justify-center text-gray-600 dark:text-gray-300">
            <div className="w-48 h-48 flex items-center justify-center">
              <LoadingOwl />
            </div>
            <p className="text-lg font-medium mt-4">Loading posts...</p>
          </div>
        </motion.div>
      )}

      {/* Main Layout */}
      <div className="min-h-[calc(100vh-4.3rem)] bg-white dark:bg-black">
        <div
          ref={mainRef}
          className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[20%_1fr_20%]"
        >
          {/* Left Sidebar */}
          <aside className="hidden lg:block bg-black text-white px-4 py-4 h-screen sticky top-[4.3rem]">
            <button
              onClick={() => setShowPostBox(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 px-6 rounded-lg transition"
            >
              + Create Post
            </button>
          </aside>

          {/* Center Feed */}
          <main className="mt-2 px-1 pb-[calc(env(safe-area-inset-bottom,0px)+72px)] lg:pb-4">
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
            />
          </main>

          {/* Right Sidebar */}
          <aside className="hidden lg:block bg-black text-white px-4 py-4 h-screen sticky top-[4.3rem]">
            <p>Right Content</p>
          </aside>
        </div>
      </div>
    </>
  );
}
