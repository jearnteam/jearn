"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { PostList } from "@/components/posts";
import { usePosts } from "@/features/posts/hooks/usePosts";
import type { Post } from "@/types/post";
import { usePullToRefresh } from "@/features/posts/hooks/usePullToRefresh";

import NotificationPage from "@/components/notifications/NotificationPage";
import { useNotifications } from "@/features/notifications/useNotifications";

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
  const [navbarVisible, setNavbarVisible] = useState(true);
  const lastScrollTop = useRef(0);

  /* ---------------------------------------------
   * VIEW STATE (KEY PART)
   * ------------------------------------------- */
  const HOME_VIEW_KEY = "home_active_view";

  const [activeView, setActiveView] = useState<HomeView>("home");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const saved = sessionStorage.getItem(HOME_VIEW_KEY) as HomeView | null;
    if (saved) {
      setActiveView(saved);
    }
  }, []);

  /* ---------------------------------------------
   * POSTS LOGIC
   * ------------------------------------------- */
  const { posts, addPost, editPost, deletePost, refetch, loading } = usePosts();

  const { unreadCount, clearUnread } = useNotifications();

  const [showPostBox, setShowPostBox] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* ---------------------------------------------
   * PULL TO REFRESH
   * ------------------------------------------- */
  usePullToRefresh(
    typeof window !== "undefined" ? { current: document.body } : mainRef,
    async () => {
      if (isRefreshing) return;
      setIsRefreshing(true);
      try {
        await refetch();
      } finally {
        setTimeout(() => setIsRefreshing(false), 600);
      }
    }
  );

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

  function changeView(view: HomeView) {
    setActiveView(view);

    if (view !== "notify") {
      clearUnread();
    }
  }

  useEffect(() => {
    sessionStorage.setItem(HOME_VIEW_KEY, activeView);
  }, [activeView]);

  if (!mounted) return null;

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
                label={t("home") || "Home"}
                active={activeView === "home"}
                onClick={() => changeView("home")}
              />

              <SidebarItem
                label={t("follow") || "Follow"}
                active={activeView === "users"}
                onClick={() => changeView("users")}
              />

              <SidebarItem
                label={t("notifications") || "Notifications"}
                active={activeView === "notify"}
                onClick={() => changeView("notify")}
                badge={unreadCount}
              />

              <SidebarItem
                label={t("jearn") || "Jearn"}
                active={activeView === "banana"}
                onClick={() => changeView("banana")}
              />
            </nav>
          </aside>

          {/* MAIN SCROLL AREA */}

          <main
            ref={mainRef}
            onScroll={(e) => {
              const current = e.currentTarget.scrollTop;

              if (current <= 0) {
                setNavbarVisible(true);
                lastScrollTop.current = 0;
                return;
              }

              if (current < lastScrollTop.current) {
                setNavbarVisible(true); // 上スクロール
              } else if (current > lastScrollTop.current) {
                setNavbarVisible(false); // 下スクロール
              }

              lastScrollTop.current = current;
            }}
            className="flex-1 overflow-y-auto no-scrollbar
                       overscroll-y-contain
                       touch-pan-y
                       pb-[calc(env(safe-area-inset-bottom,0px)+72px)]"
          >
            <HomeViewRenderer
              view={activeView}
              mainRef={mainRef}
              posts={posts}
              setEditingPost={setEditingPost}
              requestDelete={requestDelete}
              upvotePost={upvotePost}
            />
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="hidden lg:flex w-[280px] p-4">Right Content</aside>
        </div>

        {/* MOBILE NAVBAR */}
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
      className={`
        w-full text-left px-4 py-2 rounded-lg
        transition flex items-center justify-between
        ${
          active
            ? "bg-blue-600 text-white"
            : "text-gray-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }
      `}
    >
      <span>{label}</span>

      {badge > 0 && (
        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">
          {badge}
        </span>
      )}
    </button>
  );
}

function HomeViewRenderer({
  view,
  mainRef,
  posts,
  setEditingPost,
  requestDelete,
  upvotePost,
}: {
  view: HomeView;
  mainRef: React.RefObject<HTMLDivElement | null>;
  posts: Post[];
  setEditingPost: (p: Post) => void;
  requestDelete: (id: string) => void;
  upvotePost: any;
}) {
  switch (view) {
    case "home":
      return (
        <PostList
          posts={posts}
          onEdit={setEditingPost}
          onDelete={async (id) => requestDelete(id)}
          onUpvote={upvotePost}
          scrollContainerRef={mainRef}
        />
      );

    case "notify":
      return <NotificationPage />;

    case "users":
      return <div className="p-4 text-center text-gray-500">👥 Users</div>;

    case "banana":
      return <div className="p-4 text-center text-gray-500">🍌 Banana</div>;
  }
}
