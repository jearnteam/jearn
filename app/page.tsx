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
import { useTranslation } from "react-i18next";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import MobileNavbar from "@/components/MobileNavbar";

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

  const { t } = useTranslation();

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

      {/* Loading overlay */}
      {loading && <FullScreenLoader text={t("loadingUser")} />}

      {/* Scroll layout */}
      <div className="fixed inset-0 overflow-hidden bg-white dark:bg-black">
        <div className="w-full h-screen overflow-hidden bg-white dark:bg-black">
          {/* LEFT SIDEBAR */}
          <aside
            className="
              hidden lg:flex flex-col
              fixed top-[4.3rem] left-0
              w-[280px] h-[calc(100vh-4.3rem)]
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
              + {t("createPost") || "Create Post"}
            </button>
          </aside>

          {/* RIGHT SIDEBAR */}
          <aside
            className="
              hidden lg:flex flex-col
              fixed top-[4.3rem] right-0
              w-[280px] h-[calc(100vh-4.3rem)]
              bg-black text-white px-4 py-4
              border-l border-neutral-800
              overflow-y-auto
              z-30
            "
          >
            <p>Right Content</p>
          </aside>

          {/* MAIN CONTENT */}
          <main
            ref={mainRef}
            className="
              absolute 
              top-[4.3rem]
              left-0 right-0
              lg:left-[280px] lg:right-[280px]
              h-[calc(100vh-4.3rem)]
              overflow-y-auto
              no-scrollbar
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
          <MobileNavbar onCreatePost={() => setShowPostBox(true)} />
        </div>
      </div>
    </>
  );
}
