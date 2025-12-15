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

/* ---------------------------------------------
 * VIEW TYPE
 * ------------------------------------------- */
type HomeView = "home" | "notify" | "users" | "banana";

/* ---------------------------------------------
 * LOGIN REDIRECT (UNCHANGED)
 * ------------------------------------------- */
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
  const mainRef = useRef<HTMLDivElement | null>(null);

  /* ---------------------------------------------
   * VIEW STATE (KEY PART)
   * ------------------------------------------- */
  const [activeView, setActiveView] = useState<HomeView>("home");

  /* ---------------------------------------------
   * POSTS LOGIC
   * ------------------------------------------- */
  const { posts, addPost, editPost, deletePost, refetch, loading } = usePosts();

  const [showPostBox, setShowPostBox] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* ---------------------------------------------
   * PULL TO REFRESH
   * ------------------------------------------- */
  usePullToRefresh(mainRef, async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  });

  /* ---------------------------------------------
   * HELPERS
   * ------------------------------------------- */
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
  ): Promise<{
    ok: boolean;
    action?: "added" | "removed";
    error?: string;
  }> {
    try {
      const res = await fetch(`/api/posts/${id}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          ok: false,
          error: data?.error || "Upvote failed",
        };
      }

      // 🔑 ADAPT API → UI CONTRACT
      return {
        ok: true,
        action:
          data.action === "upvoted"
            ? "added"
            : data.action === "unvoted"
            ? "removed"
            : undefined,
      };
    } catch {
      return {
        ok: false,
        error: "Network error",
      };
    }
  }

  /* ---------------------------------------------
   * RESET SCROLL WHEN VIEW CHANGES
   * ------------------------------------------- */
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [activeView]);

  return (
    <>
      {/* ───── MODALS ───── */}
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

      {loading && <FullScreenLoader text={t("loadingUser")} />}

      {/* ───── LAYOUT ───── */}
      <div className="fixed inset-0 flex flex-col bg-white dark:bg-black">
        {/* HEADER SPACE */}
        <header className="h-[4.3rem]" />

        <div className="flex flex-row flex-1 overflow-hidden">
          {/* LEFT SIDEBAR */}
          <aside
            className="
    hidden lg:flex flex-col
    w-[280px]
    border-r border-neutral-800
    px-4 py-4
    gap-4
  "
          >
            {/* CREATE POST */}
            <button
              onClick={() => setShowPostBox(true)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg transition"
            >
              + {t("createPost") || "Create Post"}
            </button>

            {/* NAVIGATION */}
            <nav className="mt-6 flex flex-col gap-1">
              <SidebarItem
                label="Home"
                active={activeView === "home"}
                onClick={() => setActiveView("home")}
              />

              <SidebarItem
                label="Users"
                active={activeView === "users"}
                onClick={() => setActiveView("users")}
              />

              <SidebarItem
                label="Notifications"
                active={activeView === "notify"}
                onClick={() => setActiveView("notify")}
              />

              <SidebarItem
                label="Banana"
                active={activeView === "banana"}
                onClick={() => setActiveView("banana")}
              />
            </nav>
          </aside>

          {/* MAIN SCROLL AREA */}
          <main
            ref={mainRef}
            className="flex-1 overflow-y-auto no-scrollbar
                       pb-[calc(env(safe-area-inset-bottom,0px)+72px)]"
          >
            {isRefreshing && (
              <div className="flex justify-center py-2">
                <div className="animate-spin w-6 h-6 border-2 border-t-transparent border-blue-500 rounded-full" />
              </div>
            )}

            {/* ───── VIEW SWITCH ───── */}
            {activeView === "home" && (
              <PostList
                posts={posts}
                onEdit={setEditingPost}
                onDelete={async (id) => {
                  requestDelete(id);
                }}
                onUpvote={upvotePost}
                scrollContainerRef={mainRef}
              />
            )}

            {activeView === "notify" && (
              <div className="p-4 text-center text-gray-500">
                🔔 Notifications (placeholder)
              </div>
            )}

            {activeView === "users" && (
              <div className="p-4 text-center text-gray-500">
                👥 Users (placeholder)
              </div>
            )}

            {activeView === "banana" && (
              <div className="p-4 text-center text-gray-500">
                🍌 Banana Zone
              </div>
            )}
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="hidden lg:flex w-[280px] p-4">
            Right Content
          </aside>
        </div>

        {/* MOBILE NAVBAR */}
        <MobileNavbar
          activeView={activeView}
          onChangeView={setActiveView}
          onCreatePost={() => setShowPostBox(true)}
        />
      </div>
    </>
  );
}

function SidebarItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left px-4 py-2 rounded-lg
        transition
        ${
          active
            ? "bg-blue-600 text-white"
            : "text-gray-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }
      `}
    >
      {label}
    </button>
  );
}
