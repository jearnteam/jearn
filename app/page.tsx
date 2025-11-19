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
    if (!sessionStorage.getItem("visited")) {
      sessionStorage.setItem("visited", "true");
      router.replace("/login");
    }
  }, [router]);
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

      {/* Loading */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-neutral-900/80"
        >
          <div className="flex flex-col items-center text-gray-700 dark:text-gray-300">
            <div className="w-40 h-40">
              <LoadingOwl />
            </div>
            <p className="text-lg font-medium mt-4">Loading posts...</p>
          </div>
        </motion.div>
      )}
      {/* PAGE SCROLL DISABLED ONLY HERE */}
      <div className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
        {/* FIXED SIDEBARS + SCROLLING CENTER LAYOUT */}
        <div className="w-full h-screen overflow-hidden bg-white dark:bg-black">
          {/* LEFT SIDEBAR - FIXED */}
          <aside
            className="
      hidden xl:flex flex-col
      fixed top-[4.3rem] left-0
      w-[320px] h-[calc(100vh-4.3rem)]
      bg-black text-white px-4 py-4
      border-r border-neutral-800
      overflow-y-auto
      z-30
    "
          >
            <button
              onClick={() => setShowPostBox(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition"
            >
              + Create Post
            </button>
          </aside>

          {/* RIGHT SIDEBAR - FIXED */}
          <aside
            className="
      hidden xl:flex flex-col
      fixed top-[4.3rem] right-0
      w-[320px] h-[calc(100vh-4.3rem)]
      bg-black text-white px-4 py-4
      border-l border-neutral-800
      overflow-y-auto
      z-30
    "
          >
            <p>Right Content</p>
          </aside>

          {/* CENTER CONTENT — SCROLLABLE */}
          <main
            ref={mainRef}
            className="
      absolute 
      top-[4.3rem]
      left-0 right-0
      xl:left-[320px] xl:right-[320px]

      h-[calc(100vh-4.3rem)]
      overflow-y-auto

      px-3 md:px-6
      pb-[calc(env(safe-area-inset-bottom,0px)+72px)]
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
            />
          </main>
        </div>
      </div>
    </>
  );
}
