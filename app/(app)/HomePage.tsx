"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import type { Post } from "@/types/post";

import MobileNavbar from "@/components/MobileNavbar";
import FullScreenLoader from "@/components/common/FullScreenLoader";
import NotificationPage from "@/components/notifications/NotificationPage";
import VideosPage from "@/components/videos/VideosPage";
import PostFormBox from "@/components/posts/PostForm/PostFormBox";
import EditPostModal from "@/components/posts/EditPostModal";
import AnswerModal from "@/components/posts/AnswerModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import ChatListClient from "@/components/chat/ChatListClient";
import ChatRoomClient from "@/components/chat/ChatRoomClient";

import { useScrollBus } from "@/components/3d_spinner/ScrollContext";
import { useNotificationContext } from "@/features/notifications/NotificationProvider";
import { usePullToRefresh } from "@/features/posts/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/common/PullToRefreshIndicator";
import { usePosts } from "@/features/posts/hooks/usePosts";
import { useUpload } from "@/components/upload/UploadContext";
import { PostList } from "@/components/posts";
import { useFollowingPosts } from "@/features/posts/hooks/useFollowingPosts";
import { VideoSettingsProvider } from "@/components/videos/VideoSettingsContext";

/* ---------------------------------------------
 * VIEW TYPE
 * ------------------------------------------- */
type HomeView = "home" | "notify" | "users" | "videos" | "chat";

export default function HomePage() {
  const { t } = useTranslation();
  const { emitScroll } = useScrollBus();
  const router = useRouter();

  /* ---------------------------------------------
   * STATE
   * ------------------------------------------- */
  //current active page
  const [activeView, setActiveView] = useState<HomeView>("home");
  //mobile bottom navbar visibility when scrolling
  const [navbarVisible, setNavbarVisible] = useState(true);
  //one modal active at a time (post, edit and answer)
  const [showPostBox, setShowPostBox] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [answeringPost, setAnsweringPost] = useState<Post | null>(null);
  //for deleting post(select post -> open delete modal -> cleanup after delete)
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  //make sure not to occur conflicting uploads
  const { uploading, progress } = useUpload();
  //storing latest chatroomId
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  /* ---------------------------------------------
   * DATA
   * ------------------------------------------- */
  //main feed
  const {
    posts,
    setPosts,
    hasMore,
    fetchNext,
    refresh,
    addPost,
    addAnswer,
    editPost,
    deletePost,
    loading,
  } = usePosts();
  //followers' feed
  const {
    posts: followingPosts,
    hasMore: followingHasMore,
    loading: followingLoading,
    fetchNext: fetchFollowingNext,
    refresh: refreshFollowing,
  } = useFollowingPosts();
  //Global notification state
  const { unreadCount, clearUnread, fetchNotifications } =
    useNotificationContext();

  /* ---------------------------------------------
   * SCROLL MANAGEMENT (🔥 FIX)
   * ------------------------------------------- */
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const restoringScrollRef = useRef(false);
  //store scrollpositions for each page to restored position back instantly when switch back
  const scrollPositions = useRef<Record<HomeView, number>>({
    home: 0,
    notify: 0,
    users: 0,
    videos: 0,
    chat: 0,
  });

  /**
   * always checking for mobile navbar should be shown or not, whenever user scroll
   *
   * @param e
   * @returns
   */
  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const cur = e.currentTarget.scrollTop;

    const delta = cur - lastScrollTop.current;
    emitScroll(delta);

    if (activeView === "chat") {
      setNavbarVisible(true);
      lastScrollTop.current = cur;
      return;
    }

    // Videos page: mobile navbar always visible
    if (activeView === "videos") {
      setNavbarVisible(true);
      lastScrollTop.current = cur;
      return;
    }

    if (!restoringScrollRef.current) {
      if (cur <= 0) {
        setNavbarVisible(true);
      } else {
        // navbar logic
        // scroll DOWN → show
        // scroll UP → hide
        setNavbarVisible(cur < lastScrollTop.current);
      }
    }

    lastScrollTop.current = cur;
  }

  /**
   * handle the page navigation
   * @param next
   * @returns
   */
  function changeView(next: HomeView) {
    const el = scrollRef.current;
    if (!el) return;
    // save the states of video page, if the current activeView is Video Page.
    if (activeView === "videos") {
      window.dispatchEvent(new Event("videos:save-state"));
      window.dispatchEvent(new Event("videos:disable"));
    }

    if (next === "videos") {
      window.dispatchEvent(new Event("videos:enable"));
    }
    // clear unread when opening notifications
    if (next === "notify") {
      fetchNotifications(); // Fetch the notifications list
      clearUnread(); // MARK AS READ
    }
    // TAP HOME ICON AGAIN → SCROLL TO TOP
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
  const { pullY, refreshing } = usePullToRefresh(
    scrollRef,
    async () => {
      if (activeView === "home") {
        await refresh();
      }

      if (activeView === "users") {
        await refreshFollowing();
      }
    },
    80,
    activeView !== "chat"
  );

  /* ---------------------------------------------
   * DELETE
   * ------------------------------------------- */
  /**
   * store target post id and opens the delete modal
   * @param id
   */
  function requestDelete(id: string) {
    setDeletePostId(id);
    setConfirmDeleteOpen(true);
  }
  /**
   * delete the targeted post
   * @returns
   */
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
   * DESKTOP DETECTION
   * ------------------------------------------- */
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");

    const update = () => setIsDesktop(mq.matches);
    update();

    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  /* ---------------------------------------------
   * SCROLL RESTORATION
   * ------------------------------------------- */
  const prevViewRef = useRef<HomeView>(activeView);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const prev = prevViewRef.current;
    prevViewRef.current = activeView;

    // DO NOT restore scroll if view did not actually change
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
   * UPVOTE + NOTIFICATION EMIT
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
  type VotePollResult = {
    poll: Post["poll"];
    votedOptionIds: string[];
  };

  async function votePoll(
    postId: string,
    optionId: string
  ): Promise<VotePollResult | null> {
    const res = await apiFetch("/api/posts/polls/vote", {
      method: "POST",
      body: JSON.stringify({ postId, optionId }),
    });

    if (!res.ok) return null;

    const { poll, votedOptionIds } = await res.json();

    setPosts((prev: Post[]) =>
      prev.map((p) =>
        p._id === postId
          ? {
              ...p,
              poll: {
                ...poll,
                votedOptionIds: Array.isArray(votedOptionIds)
                  ? votedOptionIds
                  : [],
              },
            }
          : p
      )
    );

    // 🔥 RETURN SERVER TRUTH
    return {
      poll,
      votedOptionIds: Array.isArray(votedOptionIds) ? votedOptionIds : [],
    };
  }

  /* ---------------------------------------------
   * RENDER
   * ------------------------------------------- */
  if (loading) {
    return <FullScreenLoader />;
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
            await editPost(
              editingPost._id,
              editingPost.content ?? "",
              title,
              content
            );
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
              onClick={() => !uploading && setShowPostBox(true)}
              disabled={uploading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg disabled:opacity-60"
            >
              {uploading ? `Uploading ${progress}%` : `+ ${t("createPost")}`}
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
                  label={t("home")}
                  active={activeView === "home"}
                  onClick={() => changeView("home")}
                />
              </div>

              <div className="relative z-10">
                <SidebarItem
                  label={t("follow")}
                  active={activeView === "users"}
                  onClick={() => changeView("users")}
                />
              </div>

              <div className="relative z-10">
                <SidebarItem
                  label={t("notifications")}
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

              <SidebarItem
                label="Chat"
                active={activeView === "chat"}
                onClick={() => changeView("chat")}
              />
            </nav>
          </aside>

          {/* MAIN SCROLL */}
          <VideoSettingsProvider>
            <main
              ref={scrollRef}
              onScroll={onScroll}
              className={`
              flex-1 min-h-0 overflow-y-auto no-scrollbar
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
                  viewId="home"
                  posts={posts}
                  hasMore={hasMore}
                  onLoadMore={fetchNext}
                  onEdit={setEditingPost}
                  onDelete={async (id) => requestDelete(id)}
                  onUpvote={upvotePost}
                  onVote={votePoll}
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
                    {t("loading")}…
                  </div>
                )}

                {!followingLoading && followingPosts.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    フォロー中のユーザーはいません
                  </div>
                )}

                <PostList
                  viewId="users"
                  posts={followingPosts}
                  hasMore={followingHasMore}
                  onLoadMore={fetchFollowingNext}
                  onEdit={setEditingPost}
                  onDelete={async (id) => requestDelete(id)}
                  onUpvote={upvotePost}
                  onVote={votePoll}
                  onAnswer={setAnsweringPost}
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
              {activeView === "videos" && (
                <div className="block h-full">
                  <VideosPage />
                </div>
              )}

              {/* CHAT */}
              <div
                className={
                  activeView === "chat"
                    ? "block h-full"
                    : "invisible h-0 overflow-hidden"
                }
              >
                {activeRoomId ? (
                  <ChatRoomClient
                    roomId={activeRoomId}
                    onClose={() => setActiveRoomId(null)}
                  />
                ) : (
                  <ChatListClient onOpenRoom={setActiveRoomId} />
                )}
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
/**
 * returns the positions of left sidebar tags of current view page
 * @param view
 * @returns
 */
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
    case "chat":
      return 176;
    default:
      return 0;
  }
}
/**
 * api fetch function
 */
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
