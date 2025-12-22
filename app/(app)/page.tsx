"use client";

import { useEffect, useRef, useState } from "react";

import { PostList } from "@/components/posts";
import { usePosts } from "@/features/posts/hooks/usePosts";
import type { Post } from "@/types/post";

import NotificationPage from "@/components/notifications/NotificationPage";
import { useNotifications } from "@/features/notifications/useNotifications";

import PostFormBox from "@/components/posts/PostFormBox";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import MobileNavbar from "@/components/MobileNavbar";
import { useTranslation } from "react-i18next";

/* ---------------------------------------------
 * VIEW TYPE
 * ------------------------------------------- */
type HomeView = "home" | "notify" | "users" | "banana";

export default function HomePage() {
  const { t } = useTranslation();

  /* ---------------------------------------------
   * STATE
   * ------------------------------------------- */
  const [activeView, setActiveView] = useState<HomeView>("home");

  const [showPostBox, setShowPostBox] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [navbarVisible, setNavbarVisible] = useState(true);

  /* ---------------------------------------------
   * DATA
   * ------------------------------------------- */
  const { posts, addPost, editPost, deletePost, loading } = usePosts();
  const { unreadCount, clearUnread } = useNotifications();

  /* ---------------------------------------------
   * SCROLL MANAGEMENT (🔥 FIX)
   * ------------------------------------------- */
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const restoringScrollRef = useRef(false);

  const scrollPositions = useRef<Record<HomeView, number>>({
    home: 0,
    notify: 0,
    users: 0,
    banana: 0,
  });

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    if (restoringScrollRef.current) return; // ← これが核心

    const cur = e.currentTarget.scrollTop;

    if (cur <= 0) {
      setNavbarVisible(true);
    } else {
      setNavbarVisible(cur < lastScrollTop.current);
    }

    lastScrollTop.current = cur;
  }

  function changeView(next: HomeView) {
    const el = scrollRef.current;
    if (el) {
      scrollPositions.current[activeView] = el.scrollTop;
    }

    // ✅ タブ操作開始
    restoringScrollRef.current = true;

    setNavbarVisible(true);
    setActiveView(next);
  }

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      const restored = scrollPositions.current[activeView] ?? 0;

      el.scrollTop = restored;
      lastScrollTop.current = restored;

      // ✅ 次のフレームで scroll 判定を再開
      requestAnimationFrame(() => {
        restoringScrollRef.current = false;
      });
    });
  }, [activeView]);

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
      await deletePost(deletePostId);
    } finally {
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
      setDeletePostId(null);
    }
  }

  /* ---------------------------------------------
   * EFFECTS
   * ------------------------------------------- */
  const prevViewRef = useRef<HomeView>("home");

  useEffect(() => {
    if (prevViewRef.current === "notify" && activeView !== "notify") {
      clearUnread();
    }
    prevViewRef.current = activeView;
  }, [activeView, clearUnread]);

  /* ---------------------------------------------
   * UPVOTE
   * ------------------------------------------- */
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
        return { ok: false, error: data?.error || "Upvote failed" };
      }

      if (data.action === "upvoted") {
        return { ok: true, action: "added" };
      }

      if (data.action === "unvoted") {
        return { ok: true, action: "removed" };
      }

      return { ok: true };
    } catch {
      return { ok: false, error: "Network error" };
    }
  }

  /* ---------------------------------------------
   * RENDER
   * ------------------------------------------- */
  if (loading) {
    return <FullScreenLoader text={t("loadingUser")} />;
  }

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

      {/* ───── LAYOUT ───── */}
      <div className="fixed inset-0 flex flex-col bg-white dark:bg-black">
        <header className="h-[4.3rem]" />

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT SIDEBAR */}
          <aside className="hidden lg:flex w-[280px] px-4 py-4 flex-col gap-4">
            <button
              onClick={() => setShowPostBox(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg"
            >
              + {t("createPost") || "Create Post"}
            </button>

            <nav className="mt-6 flex flex-col gap-1">
              <SidebarItem
                label="Home"
                active={activeView === "home"}
                onClick={() => changeView("home")}
              />
              <SidebarItem
                label="Notifications"
                active={activeView === "notify"}
                onClick={() => changeView("notify")}
                badge={unreadCount}
              />
              <SidebarItem
                label="Users"
                active={activeView === "users"}
                onClick={() => changeView("users")}
              />
              <SidebarItem
                label="Jearn"
                active={activeView === "banana"}
                onClick={() => changeView("banana")}
              />
            </nav>
          </aside>

          {/* MAIN SCROLL */}
          <main
            ref={scrollRef}
            onScroll={onScroll}
            className="flex-1 overflow-y-auto no-scrollbar pb-[72px]"
          >
            {/* HOME */}
            <div
              className={
                activeView === "home"
                  ? "block"
                  : "invisible h-0 overflow-hidden"
              }
            >
              <PostList
                posts={posts}
                onEdit={setEditingPost}
                onDelete={async (id) => requestDelete(id)}
                onUpvote={upvotePost}
              />
            </div>

            {/* NOTIFICATIONS */}
            <div
              className={
                activeView === "notify"
                  ? "block"
                  : "invisible h-0 overflow-hidden"
              }
            >
              <NotificationPage />
            </div>

            {/* USERS */}
            <div
              className={
                activeView === "users"
                  ? "block"
                  : "invisible h-0 overflow-hidden"
              }
            >
              <div className="p-4 text-center text-gray-500">👥 Users</div>
            </div>

            {/* BANANA */}
            <div
              className={
                activeView === "banana"
                  ? "block"
                  : "invisible h-0 overflow-hidden"
              }
            >
              <div className="p-4 text-center text-gray-500">🍌 Banana</div>
            </div>
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="hidden lg:flex w-[280px] p-4" />
        </div>

        <MobileNavbar
          activeView={activeView}
          onChangeView={changeView}
          onCreatePost={() => setShowPostBox(true)}
          unreadCount={unreadCount}
          visible={navbarVisible}
        />
      </div>
    </>
  );
}

/* ---------------------------------------------
 * SIDEBAR ITEM
 * ------------------------------------------- */
function SidebarItem({
  label,
  active,
  onClick,
  badge = 0,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg flex justify-between ${
        active
          ? "bg-blue-600 text-white"
          : "hover:bg-neutral-100 dark:hover:bg-neutral-800"
      }`}
    >
      <span>{label}</span>
      {badge > 0 && (
        <span className="text-xs px-2 rounded-full bg-blue-600 text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
