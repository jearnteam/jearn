"use client";

import { useEffect, useRef, useState } from "react";

import { PostList } from "@/components/posts";
import { usePosts } from "@/features/posts/hooks/usePosts";
import { usePullToRefresh } from "@/features/posts/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import type { Post } from "@/types/post";
import { useFollowingPosts } from "@/features/posts/hooks/useFollowingPosts";

import NotificationPage from "@/components/notifications/NotificationPage";
import { useNotifications } from "@/features/notifications/useNotifications";

import PostFormBox from "@/components/posts/PostFormBox";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import MobileNavbar from "@/components/MobileNavbar";
import { useTranslation } from "react-i18next";
import AnswerModal from "@/components/posts/AnswerModal";
import { motion } from "framer-motion";
import VideosPage from "@/components/videos/VideosPage";
import { VideoSettingsProvider } from "@/components/videos/VideoSettingsContext";

import { useScrollBus } from "@/components/3d_spinner/ScrollContext";

/* ---------------------------------------------
 * VIEW TYPE
 * ------------------------------------------- */
type HomeView = "home" | "notify" | "users" | "videos";

export default function HomePage() {
  const { t } = useTranslation();
  const { emitScroll } = useScrollBus();

  /* ---------------------------------------------
   * STATE
   * ------------------------------------------- */
  const [activeView, setActiveView] = useState<HomeView>("home");

  const [showPostBox, setShowPostBox] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [answeringPost, setAnsweringPost] = useState<Post | null>(null);

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [navbarVisible, setNavbarVisible] = useState(true);

  /* ---------------------------------------------
   * DATA
   * ------------------------------------------- */
  const {
    posts,
    hasMore,
    fetchNext,
    refresh,
    addPost,
    addAnswer,
    editPost,
    deletePost,
    loading,
  } = usePosts();

  const {
    posts: followingPosts,
    hasMore: followingHasMore,
    loading: followingLoading,
    fetchNext: fetchFollowingNext,
    refresh: refreshFollowing,
  } = useFollowingPosts();

  const { unreadCount, clearUnread, fetchNotifications } = useNotifications();

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
    videos: 0,
  });

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const cur = e.currentTarget.scrollTop;

    const delta = cur - lastScrollTop.current;
    emitScroll(delta);

    // 🎥 Videos page: mobile navbar always visible
    if (activeView === "videos") {
      setNavbarVisible(true);
      lastScrollTop.current = cur;
      return;
    }

    if (!restoringScrollRef.current) {
      if (cur <= 0) {
        setNavbarVisible(true);
      } else {
        // 🔥 reversed logic
        // scroll DOWN → show
        // scroll UP → hide
        setNavbarVisible(cur > lastScrollTop.current);
      }
    }

    lastScrollTop.current = cur;
  }

  function changeView(next: HomeView) {
    const el = scrollRef.current;
    if (!el) return;

    // BEFORE anything else
    if (activeView === "videos") {
      window.dispatchEvent(new Event("videos:save-state"));
      window.dispatchEvent(new Event("videos:disable"));
    }

    if (next === "videos") {
      window.dispatchEvent(new Event("videos:enable"));
    }

    // 🔔 clear unread when opening notifications
    if (next === "notify") {
      fetchNotifications(); // FETCH LIST HERE
      clearUnread(); // MARK READ
    }

    // TAP HOME AGAIN → SCROLL TO TOP
    if (next === "home" && activeView === "home") {
      restoringScrollRef.current = true;
      setNavbarVisible(true);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.scrollTo({ top: 0, behavior: "smooth" });

          const unlock = () => {
            if (!scrollRef.current) return;
            if (scrollRef.current.scrollTop <= 0) {
              restoringScrollRef.current = false;
              lastScrollTop.current = 0;
            } else {
              requestAnimationFrame(unlock);
            }
          };

          requestAnimationFrame(unlock);
        });
      });

      return;
    }

    scrollPositions.current[activeView] = el.scrollTop;
    restoringScrollRef.current = true;
    setNavbarVisible(true);
    setActiveView(next);
  }

  /* ---------------------------------------------
   * PULL TO REFRESH
   * ------------------------------------------- */

  const { pullY, refreshing } = usePullToRefresh(scrollRef, async () => {
    if (activeView === "home") {
      await refresh();
    }

    if (activeView === "users") {
      await refreshFollowing();
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
      await deletePost(deletePostId);
    } finally {
      setIsDeleting(false);
      setConfirmDeleteOpen(false);
      setDeletePostId(null);
    }
  }

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");

    const update = () => setIsDesktop(mq.matches);
    update();

    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /* ---------------------------------------------
   * EFFECTS
   * ------------------------------------------- */
  const prevViewRef = useRef<HomeView>(activeView);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const prev = prevViewRef.current;
    prevViewRef.current = activeView;

    // ✅ DO NOT restore scroll if view did not actually change
    if (prev === activeView) {
      restoringScrollRef.current = false;
      return;
    }

    requestAnimationFrame(() => {
      const restored = scrollPositions.current[activeView] ?? 0;

      el.scrollTop = restored;
      lastScrollTop.current = restored;

      requestAnimationFrame(() => {
        restoringScrollRef.current = false;
      });
    });
  }, [activeView]);

  /* ---------------------------------------------
   * UPVOTE
   * ------------------------------------------- */
  async function upvotePost(id: string) {
    const res = await apiFetch(`/api/posts/${id}/upvote`, {
      method: "POST",
    });

    const data = await res.json();

    if (!res.ok) return;

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

      {answeringPost && (
        <AnswerModal
          questionPost={answeringPost}
          onClose={() => setAnsweringPost(null)}
          onSubmit={addAnswer}
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
      <div
        className="fixed inset-0 flex flex-col bg-white dark:bg-black"
        style={{
          ["--top-navbar-h" as any]: "4rem",
          ["--mobile-navbar-h" as any]: "80px",
        }}
      >
        <header className="h-16" />

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT SIDEBAR */}
          <aside className="hidden lg:flex w-[280px] px-4 py-4 flex-col gap-4">
            <button
              onClick={() => setShowPostBox(true)}
              className="w-full bg-blue-600 text-white py-3 rounded-lg"
            >
              + {t("createPost") || "Create Post"}
            </button>

            <nav className="mt-6 relative flex flex-col gap-1">
              {/* ACTIVE INDICATOR */}
              <motion.div
                layout
                layoutId="sidebar-indicator"
                className="
        absolute left-0 right-0
        h-[40px]
        rounded-lg
        bg-blue-600
        z-0
        pointer-events-none
      "
                style={{ top: getSidebarIndicatorTop(activeView) }}
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 35,
                }}
              />

              {/* ITEMS */}
              <div className="relative z-10">
                <SidebarItem
                  label={t("home") || "home"}
                  active={activeView === "home"}
                  onClick={() => changeView("home")}
                />
              </div>

              <div className="relative z-10">
                <SidebarItem
                  label={t("follow") || "follow"}
                  active={activeView === "users"}
                  onClick={() => changeView("users")}
                />
              </div>

              <div className="relative z-10">
                <SidebarItem
                  label={t("notifications") || "notifications"}
                  active={activeView === "notify"}
                  onClick={() => changeView("notify")}
                  badge={unreadCount}
                />
              </div>

              <div className="relative z-10">
                <SidebarItem
                  label="Videos"
                  active={activeView === "videos"}
                  onClick={() => changeView("videos")}
                />
              </div>
            </nav>
          </aside>

          {/* MAIN SCROLL */}
          <VideoSettingsProvider>
            <main
              ref={scrollRef}
              onScroll={onScroll}
              className={`
              flex-1 overflow-y-auto no-scrollbar
              ${
                activeView === "videos"
                  ? "snap-y snap-mandatory"
                  : "pb-[72px] lg:pb-0"
              }
            `}
              style={{
                height:
                  activeView === "videos" && !isDesktop
                    ? "calc(100svh - var(--top-navbar-h) - var(--mobile-navbar-h))"
                    : undefined,
                transform: `translateY(${pullY}px)`,
                transition: refreshing ? "transform 0.2s ease" : "none",
              }}
            >
              <PullToRefreshIndicator pullY={pullY} refreshing={refreshing} />
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
                  hasMore={hasMore}
                  onLoadMore={fetchNext}
                  onEdit={setEditingPost}
                  onDelete={async (id) => requestDelete(id)}
                  onUpvote={upvotePost}
                  onAnswer={setAnsweringPost}
                  scrollContainerRef={scrollRef}
                />
              </div>

              {/* USERS */}
              {/* USERS（フォロー中） */}
              <div
                className={
                  activeView === "users"
                    ? "block"
                    : "invisible h-0 overflow-hidden"
                }
              >
                {followingLoading && (
                  <div className="p-4 text-center text-gray-500">
                    読み込み中…
                  </div>
                )}

                {!followingLoading && followingPosts.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    フォロー中のユーザーはいません
                  </div>
                )}

                <PostList
                  posts={followingPosts}
                  hasMore={followingHasMore}
                  onLoadMore={fetchFollowingNext}
                  /* ▼ PostList が要求する Props をすべて満たす */
                  onEdit={async (_post) => {}}
                  onDelete={async (_id: string) => {}}
                  onUpvote={async (_id: string) => {}}
                  onAnswer={(_post) => {}}
                  scrollContainerRef={scrollRef}
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

              {/* VIDEOS */}
              <div
                className={
                  activeView === "videos"
                    ? "block h-full"
                    : "invisible h-0 overflow-hidden"
                }
              >
                <VideosPage />
              </div>
            </main>
          </VideoSettingsProvider>

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

function getSidebarIndicatorTop(view: HomeView) {
  switch (view) {
    case "home":
      return 0;
    case "users":
      return 44;
    case "notify":
      return 88;
    case "videos":
      return 132;
    default:
      return 0;
  }
}

export async function apiFetch(url: string, init?: RequestInit) {
  return fetch(url, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
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
      className={[
        "relative w-full px-4 py-2 rounded-lg", // ← w-full is the key
        "flex items-center justify-between gap-3",
        "transition-colors",
        !active && "hover:bg-neutral-100 dark:hover:bg-neutral-800",
        active && "text-white",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span className="truncate">{label}</span>

      {/* unread badge */}
      {badge > 0 && (
        <span
          className="
            h-[18px] min-w-[18px]
            px-[6px]
            rounded-full
            bg-red-600 text-white
            text-[10px] font-semibold
            inline-flex items-center justify-center
            leading-none
          "
        >
          <span className="relative top-[0.5px]">
            {badge > 99 ? "99+" : badge}
          </span>
        </span>
      )}
    </button>
  );
}
