"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  ArrowBigUp,
  MessageCircle,
  Share2,
  MoreVertical,
  Pencil,
  Trash2,
  Flag,
  Network,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import dayjs from "@/lib/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MathRenderer } from "@/components/math/MathRenderer";
import Link from "next/link";
import SharePostModal from "@/components/common/SharePostModal";
import type { Post } from "@/types/post";
import { rememberTx } from "@/lib/recentTx";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import FullScreenPortal from "@/features/FullScreenPortal";
import GraphView from "@/components/graphview/GraphView";

dayjs.extend(relativeTime);

const LINE_HEIGHT = 20;
const FULL_LINES_LIMIT = 10;
const MAX_PREVIEW_IMAGE_HEIGHT = 400;

export default function PostItem({
  post,
  onEdit,
  onDelete,
  onUpvote,
  isSingle = false,
  scrollContainerRef,
}: {
  post: Post;
  onEdit?: (post: Post) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onUpvote?: (id: string, userId: string, txId?: string) => Promise<any>;
  isSingle?: boolean;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { user } = useCurrentUser();
  const userId = user?._id ?? "";
  const { t } = useTranslation();

  const [postState, setPostState] = useState(post);
  useEffect(() => setPostState(post), [post]);

  const [shareOpen, setShareOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [measureDone, setMeasureDone] = useState(false);
  const [startsWithImage, setStartsWithImage] = useState(false);

  const [showGraph, setShowGraph] = useState(false);
  const [graphKey, setGraphKey] = useState(0);

  const contentRef = useRef<HTMLDivElement | null>(null);

  // menu dropdown
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // ----------- avatar logic ----------
  const defaultAvatar = "/default-avatar.png";

  const ts = postState.authorAvatarUpdatedAt
    ? `?t=${new Date(postState.authorAvatarUpdatedAt).getTime()}`
    : "";

  const realAvatarUrl =
    (postState.authorAvatar ||
      `https://cdn.jearn.site/avatars/${postState.authorId}.webp`) + ts;

  const [avatarLoaded, setAvatarLoaded] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = realAvatarUrl;
    img.onload = () => setAvatarLoaded(true);
    img.onerror = () => setAvatarLoaded(true);
  }, [realAvatarUrl]);

  /* --------------------------------------------
   * COLLAPSE LOGIC — IMAGE-FIRST SPECIAL MODE
   * -------------------------------------------- */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const first = el.querySelector(":scope > *");
    const firstIsImage =
      first && first.tagName === "IMG" && first.hasAttribute("data-type");

    setStartsWithImage(Boolean(firstIsImage));

    if (!firstIsImage) {
      requestAnimationFrame(() => {
        const full = el.scrollHeight;
        const limit = LINE_HEIGHT * FULL_LINES_LIMIT;
        setCollapsedHeight(full <= limit ? null : limit);
        setMeasureDone(true);
      });
      return;
    }

    const img = first as HTMLImageElement;

    function applyCollapsed(h: number) {
      const finalH = Math.min(h, MAX_PREVIEW_IMAGE_HEIGHT);
      setCollapsedHeight(finalH);
      setMeasureDone(true);
    }

    if (img.complete) {
      applyCollapsed(img.offsetHeight || img.naturalHeight);
    } else {
      img.onload = () =>
        applyCollapsed(img.offsetHeight || img.naturalHeight || 200);
      img.onerror = () => applyCollapsed(200);
    }
  }, [postState.content]);

  const shouldTruncate = collapsedHeight !== null;
  const targetHeight = expanded ? "auto" : collapsedHeight ?? "auto";

  /* --------------------------------------------
   * DOUBLE TAP COLLAPSE
   * -------------------------------------------- */
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const lastTapRef = useRef(0);

  function collapsePost() {
    if (!expanded) return;

    setExpanded(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const scroller = scrollContainerRef?.current;
        const wrapper = wrapperRef.current;
        if (!scroller || !wrapper) return;

        // Position of wrapper relative to the scroller
        const wrapperTopRelative =
          wrapper.getBoundingClientRect().top -
          scroller.getBoundingClientRect().top +
          scroller.scrollTop;

        scroller.scrollTo({
          top: wrapperTopRelative,
          behavior: "smooth",
        });
      });
    });
  }

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    function onTap(e: TouchEvent | MouseEvent) {
      const target = e.target as HTMLElement;

      // Ignore taps on links or buttons
      if (target.closest("button") || target.closest("a")) return;

      const now = Date.now();
      const delta = now - lastTapRef.current;

      lastTapRef.current = now;

      if (expanded && delta < 300) {
        e.preventDefault();
        e.stopPropagation();
        collapsePost();
      }
    }

    wrapper.addEventListener("touchend", onTap);
    wrapper.addEventListener("dblclick", onTap);

    return () => {
      wrapper.removeEventListener("touchend", onTap);
      wrapper.removeEventListener("dblclick", onTap);
    };
  }, [expanded]);

  /* --------------------------------------------
   * REPORT / UPVOTE LOGIC
   * -------------------------------------------- */
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [pending, setPending] = useState(false);

  const hasUpvoted = userId && postState.upvoters?.includes(userId);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/reports/check?postId=${post._id}&userId=${userId}`
        );
        const data = await res.json();
        setAlreadyReported(data.alreadyReported);
      } catch {}
    })();
  }, [post._id, userId]);

  const handleUpvote = useCallback(async () => {
    if (!userId || !postState._id || pending) return;

    setPending(true);
    const already = postState.upvoters?.includes(userId);
    const txId = crypto.randomUUID();
    rememberTx(txId);

    setPostState((prev) => ({
      ...prev,
      upvoteCount: already ? prev.upvoteCount - 1 : prev.upvoteCount + 1,
      upvoters: already
        ? prev.upvoters.filter((id) => id !== userId)
        : [...prev.upvoters, userId],
    }));

    try {
      if (onUpvote) {
        await onUpvote(postState._id, userId, txId);
      } else {
        await fetch(`/api/posts/${postState._id}/upvote`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, txId }),
        });
      }
    } catch {
      setPostState((prev) => ({
        ...prev,
        upvoteCount: already ? prev.upvoteCount + 1 : prev.upvoteCount - 1,
        upvoters: already
          ? [...prev.upvoters, userId]
          : prev.upvoters.filter((id) => id !== userId),
      }));
    }

    setPending(false);
  }, [userId, postState._id, postState.upvoters, pending, onUpvote]);

  /* --------------------------------------------
   * EDIT / DELETE / REPORT MENU (OLD LAYOUT)
   * -------------------------------------------- */
  const handleEdit = async () => {
    setMenuOpen(false);
    await onEdit?.(postState);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (postState._id) await onDelete?.(postState._id);
  };

  const handleReport = async () => {
    if (!userId) return alert("Login required.");
    if (userId === String(postState.authorId))
      return alert("You can't report your own post.");
    if (alreadyReported) return alert("Already reported.");

    const reason = prompt("Why report?");
    if (!reason?.trim()) return;

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: postState._id,
          reporterId: userId,
          reason: reason.trim(),
        }),
      });

      if (res.status === 409) {
        alert("Already reported.");
        setAlreadyReported(true);
        return;
      }

      if (!res.ok) return alert("Failed to report.");
      alert("Report submitted.");
      setAlreadyReported(true);
    } catch {
      alert("Failed.");
    }
  };

  // close menu on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  /** EXPAND / COLLAPSE — WITH SCROLL RESTORE */
  const toggleExpand = () => {
    if (!shouldTruncate) return;

    // EXPAND
    if (!expanded) {
      setExpanded(true);
      return;
    }

    // COLLAPSE
    setExpanded(false);

    // Wait 2 frames for Framer Motion to apply new height
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const postEl = document.getElementById(`post-${postState._id}`);
        if (!postEl) return;

        postEl.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  };

  /* --------------------------------------------
   * RENDER UI
   * -------------------------------------------- */
  return (
    <>
      <div
        ref={wrapperRef}
        id={`post-wrapper-${postState._id}`}
        className="mb-3"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div
            id={`post-${postState._id}`}
            className="relative bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-all"
          >
            {/* HEADER (OLD LAYOUT) */}
            <div className="flex items-center justify-between mb-3">
              {/* LEFT SIDE — AUTHOR */}
              <Link
                href={`/profile/${postState.authorId}`}
                scroll={false}
                className="flex items-center hover:opacity-80 transition"
              >
                <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700 mr-3">
                  {!avatarLoaded && (
                    <img
                      src={defaultAvatar}
                      className="w-full h-full object-cover opacity-70"
                      alt="avatar"
                    />
                  )}
                  <img
                    src={realAvatarUrl}
                    className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-300 ${
                      avatarLoaded ? "opacity-100" : "opacity-0"
                    }`}
                    alt="avatar"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {postState.authorName}
                    </p>
                    {postState.authorUserId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        @{postState.authorUserId}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {dayjs(postState.createdAt).locale(i18n.language).fromNow()}
                  </p>
                </div>
              </Link>

              {/* RIGHT SIDE — GRAPH + MENU */}
              <div className="flex items-center gap-1">
                {/* GRAPH BUTTON */}
                <button
                  onClick={() => {
                    if (!showGraph) setGraphKey(Date.now());
                    setShowGraph(!showGraph);
                  }}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                  title="Graph View"
                >
                  <Network
                    size={20}
                    className={showGraph ? "text-green-500" : "text-blue-500"}
                  />
                </button>

                {/* MENU */}
                {userId && (
                  <div className="relative" ref={menuRef}>
                    <button
                      onClick={() => setMenuOpen((v) => !v)}
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800"
                    >
                      <MoreVertical size={20} />
                    </button>

                    <AnimatePresence>
                      {menuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -5 }}
                          className="absolute right-0 mt-2 w-44 z-20 rounded-md overflow-hidden shadow-lg bg-white dark:bg-neutral-800 border border-gray-200 dark:border-gray-700"
                        >
                          {userId === String(postState.authorId) ? (
                            <>
                              <button
                                onClick={handleEdit}
                                className="flex items-center gap-3 w-full px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700"
                              >
                                <Pencil className="w-4 h-4 text-blue-500" />
                                <span>{t("edit") || "Edit"}</span>
                              </button>

                              <button
                                onClick={handleDelete}
                                className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-neutral-700"
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                                <span>{t("delete") || "Delete"}</span>
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={handleReport}
                              disabled={alreadyReported}
                              className={`flex items-center gap-3 w-full px-4 py-2 text-yellow-600 ${
                                alreadyReported
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:bg-gray-100 dark:hover:bg-neutral-700"
                              }`}
                            >
                              <Flag className="w-4 h-4 text-yellow-500" />
                              <span>
                                {alreadyReported
                                  ? t("reported") || "Reported"
                                  : t("report") || "Report"}
                              </span>
                            </button>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* TITLE */}
            {!post.parentId && (
              <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
                {postState.title}
              </h2>
            )}

            {/* CONTENT */}
            <motion.div
              animate={{ height: targetHeight }}
              initial={{ height: 0 }}
              transition={{ duration: measureDone ? 0.25 : 0 }}
              className="mt-2 overflow-hidden"
            >
              <div
                ref={contentRef}
                style={{
                  opacity: measureDone ? 1 : 0,
                  pointerEvents: measureDone ? "auto" : "none",
                }}
              >
                {startsWithImage && !expanded ? (
                  <div className="overflow-hidden">
                    <MathRenderer html={postState.content ?? ""} />
                  </div>
                ) : (
                  <MathRenderer html={postState.content ?? ""} />
                )}
              </div>
            </motion.div>

            {/* SHOW MORE / LESS */}
            {shouldTruncate && (
              <button
                onClick={toggleExpand}
                className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                {expanded
                  ? `${t("showLess") || "Show Less"} ▲`
                  : `${t("showMore") || "Show More"} ▼`}
              </button>
            )}

            {/* FOOTER */}
            <div className="mt-4 flex space-x-6 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
              <div className="flex items-center gap-5">
                {/* UPVOTE */}
                <button
                  onClick={handleUpvote}
                  disabled={pending}
                  className={`flex items-center gap-1 ${
                    hasUpvoted
                      ? "text-blue-600 dark:text-blue-400"
                      : "hover:text-blue-600 dark:hover:text-blue-400"
                  }`}
                >
                  <ArrowBigUp size={18} /> {postState.upvoteCount ?? 0}
                </button>

                {/* COMMENTS */}
                {!isSingle && !post.parentId && (
                  <Link
                    href={`/posts/${postState._id}#comments`}
                    scroll={false}
                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <MessageCircle size={18} />
                    {postState.commentCount ?? 0}
                  </Link>
                )}

                {/* SHARE */}
                {!post.parentId && (
                  <button
                    onClick={() => setShareOpen(true)}
                    className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    <Share2 size={18} /> {t("share") || "Share"}
                  </button>
                )}
              </div>

              {/* EDITED */}
              <div>
                {postState.edited
                  ? `(edited ${dayjs(postState.editedAt)
                      .locale(i18n.language)
                      .fromNow()})`
                  : ""}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* SHARE MODAL */}
      <SharePostModal
        open={shareOpen}
        postUrl={`${
          typeof window !== "undefined" ? window.location.origin : ""
        }/posts/${postState._id}`}
        onCancel={() => setShareOpen(false)}
      />

      {/* GRAPH VIEW */}
      <FullScreenPortal>
        {showGraph && (
          <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center p-6">
            <div
              className="relative max-w-4xl w-full h-[80vh] rounded-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowGraph(false)}
                className="absolute top-3 right-3 z-[50] w-12 h-12 flex items-center justify-center rounded-full bg-black/70 text-white text-2xl font-bold hover:bg-black/90 transition"
              >
                ×
              </button>

              <div className="relative text-green-400 font-mono rounded-lg w-full h-full border border-blue-500 overflow-auto">
                <GraphView key={graphKey} post={postState} />
              </div>
            </div>
          </div>
        )}
      </FullScreenPortal>
    </>
  );
}
