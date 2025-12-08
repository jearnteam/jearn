"use client";

import {
  useCallback,
  useRef,
  useState,
  useEffect,
  type CSSProperties,
} from "react";
import {
  MoreVertical,
  ArrowBigUp,
  MessageCircle,
  Share2,
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

type ScrollContainer =
  | { type: "window"; el: Window }
  | { type: "element"; el: HTMLElement };

function getScrollParent(element: HTMLElement | null): ScrollContainer {
  if (!element) return { type: "window", el: window };

  let parent: HTMLElement | null = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    if (overflowY === "auto" || overflowY === "scroll") {
      return { type: "element", el: parent };
    }
    parent = parent.parentElement;
  }

  return { type: "window", el: window };
}

interface PostItemProps {
  post: Post;
  onEdit?: (post: Post) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onUpvote?: (id: string, userId: string, txId?: string) => Promise<any>;
  isSingle?: boolean;
}

const LINE_HEIGHT = 20;
const COLLAPSED_LINES = 5;
const FULL_LINES_LIMIT = 10;
const MAX_PREVIEW_IMAGE_HEIGHT = 400; // px

export default function PostItem({
  post,
  onEdit,
  onDelete,
  onUpvote,
  isSingle = false,
}: PostItemProps) {
  const { user } = useCurrentUser();
  const userId = user?._id ?? "";
  const { t } = useTranslation();

  const [postState, setPostState] = useState(post);
  useEffect(() => setPostState(post), [post]);
  const [showGraph, setShowGraph] = useState(false);
  const [graphKey, setGraphKey] = useState(0);

  const hasUpvoted = userId && postState.upvoters?.includes(userId);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const [expanded, setExpanded] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [measureDone, setMeasureDone] = useState(false);

  const contentRef = useRef<HTMLDivElement | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);

  const isAdminAuthor = postState.isAdmin === true;

  const [hue] = useState(() => Math.floor(Math.random() * 360));
  const [speed] = useState(() => 2 + Math.random() * 2);

  const defaultAvatar = "/default-avatar.png";

  const realAvatarUrl =
    postState.authorAvatar && postState.authorAvatar.startsWith("http")
      ? postState.authorAvatar
      : `/api/user/avatar/${postState.authorId}`;

  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [imageNode, setImageNode] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = realAvatarUrl;
    img.onload = () => setAvatarLoaded(true);
    img.onerror = () => setAvatarLoaded(true);
  }, [realAvatarUrl]);

  /**
   * ⭐ MEASUREMENT / PREVIEW LOGIC
   * - Wait for MathRenderer + all images
   * - Force first image to behave as preview (max-height 400px)
   * - collapsedHeight = rendered first image height (<= 400)
   * - If no image: collapsedHeight = 5 lines
   */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const container = el;

    function doMeasure() {
      if (!container) return;

      // Full content height
      const full = container.scrollHeight;
      setMeasuredHeight(full);

      const fullLimit = LINE_HEIGHT * FULL_LINES_LIMIT;

      // Find first image and make it "hero preview"
      const firstImg = container.querySelector(
        "img"
      ) as HTMLImageElement | null;

      let previewHeight = LINE_HEIGHT * COLLAPSED_LINES; // fallback when no image

      if (firstImg) {
        // Apply preview styles to first image (clamped to 400px)
        firstImg.style.maxHeight = `${MAX_PREVIEW_IMAGE_HEIGHT}px`;
        firstImg.style.cursor = "pointer";
        firstImg.style.width = "100%";
        firstImg.style.height = "auto";
        firstImg.style.objectFit = "contain";
        firstImg.style.display = "block";

        const rect = firstImg.getBoundingClientRect();
        const imgHeight = rect.height || firstImg.naturalHeight || 0;
        previewHeight = Math.min(imgHeight, MAX_PREVIEW_IMAGE_HEIGHT);
      }

      if (full <= fullLimit) {
        // Short / medium post → no truncation at all
        setCollapsedHeight(null);
      } else {
        // Long post → collapse to first-image preview (or 5 lines)
        setCollapsedHeight(previewHeight);
      }

      setMeasureDone(true);
    }

    const images = container.querySelectorAll("img");

    if (images.length === 0) {
      // No images → just measure immediately
      doMeasure();
      return;
    }

    let loaded = 0;

    const handleImgDone = () => {
      loaded++;
      if (loaded === images.length) {
        doMeasure();
      }
    };

    images.forEach((img) => {
      if (img.complete) {
        handleImgDone();
      } else {
        img.addEventListener("load", handleImgDone);
        img.addEventListener("error", handleImgDone);
      }
    });

    return () => {
      images.forEach((img) => {
        img.removeEventListener("load", handleImgDone);
        img.removeEventListener("error", handleImgDone);
      });
    };
  }, [postState.content]);

  const shouldTruncate = measuredHeight > LINE_HEIGHT * FULL_LINES_LIMIT;
  const isShortPost = !shouldTruncate;

  // Fullscreen image click handler
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "IMG") return;

      const original = target as HTMLImageElement;
      const clone = original.cloneNode(true) as HTMLImageElement;

      clone.removeAttribute("width");
      clone.removeAttribute("height");

      clone.style.width = "100%";
      clone.style.height = "100%";
      clone.style.maxWidth = "100%";
      clone.style.maxHeight = "100%";
      clone.style.objectFit = "contain";
      clone.style.display = "block";

      setImageNode(clone);
    };

    el.addEventListener("click", handleImageClick);
    return () => el.removeEventListener("click", handleImageClick);
  }, []);

  // Outside click for menu
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Report check
  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/reports/check?postId=${post._id}&userId=${userId}`
        );
        const data = await res.json();
        setAlreadyReported(data.alreadyReported);
      } catch {
        // ignore
      }
    })();
  }, [post._id, userId]);

  const toggleExpand = () => {
    if (!shouldTruncate) return;

    // expand
    if (!expanded) {
      setExpanded(true);
      return;
    }

    // collapse with scroll-adjust
    const el = document.getElementById(`post-${postState._id}`);
    if (!el) {
      setExpanded(false);
      return;
    }

    const scrollParent = getScrollParent(el);
    const rect = el.getBoundingClientRect();
    const THRESHOLD = 20;

    const isTopVisible = rect.top >= 0 - THRESHOLD;

    if (isTopVisible) {
      setExpanded(false);
      return;
    }

    const OFFSET = 0;

    if (scrollParent.type === "window") {
      window.scrollTo({
        top: window.scrollY + rect.top - OFFSET,
      });
    } else {
      const parentRect = scrollParent.el.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      const target =
        scrollParent.el.scrollTop + (elRect.top - parentRect.top) - OFFSET;

      scrollParent.el.scrollTo({ top: target });
    }

    let last = -1;
    const waitScroll = () => {
      const current =
        scrollParent.type === "window"
          ? window.scrollY
          : scrollParent.el.scrollTop;

      if (current === last) {
        setExpanded(false);
        return;
      }

      last = current;
      requestAnimationFrame(waitScroll);
    };

    requestAnimationFrame(waitScroll);
  };

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

      if (!res.ok) {
        alert("Failed to report.");
        return;
      }

      alert("Report submitted.");
      setAlreadyReported(true);
    } catch {
      alert("Failed.");
    }
  };

  const [pending, setPending] = useState(false);

  const handleUpvote = useCallback(async () => {
    if (!userId || !postState._id || pending) return;
    setPending(true);

    const alreadyUpvoted = postState.upvoters?.includes(userId);
    const txId = crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    rememberTx(txId);

    setPostState((prev) => ({
      ...prev,
      upvoteCount: alreadyUpvoted ? prev.upvoteCount - 1 : prev.upvoteCount + 1,
      upvoters: alreadyUpvoted
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
      // rollback
      setPostState((prev) => ({
        ...prev,
        upvoteCount: alreadyUpvoted
          ? prev.upvoteCount + 1
          : prev.upvoteCount - 1,
        upvoters: alreadyUpvoted
          ? [...prev.upvoters, userId]
          : prev.upvoters.filter((id) => id !== userId),
      }));
    }

    setPending(false);
  }, [userId, postState._id, postState.upvoters, pending, onUpvote]);

  const isComment = !!post.parentId;
  const WrapperTag: any = isComment ? "div" : "li";

  // 🎯 Height logic for Motion wrapper
  const targetHeight: number | "auto" = !measureDone
    ? 0
    : !shouldTruncate
    ? "auto"
    : expanded
    ? "auto"
    : collapsedHeight ?? 0;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <WrapperTag
          id={`post-${postState._id}`}
          className={`relative ${
            isAdminAuthor ? "admin-post-glow" : ""
          } bg-white dark:bg-neutral-900 
            border border-gray-200 dark:border-gray-700 
            rounded-xl p-4 shadow-sm hover:shadow-md transition-all
            list-none`}
          style={
            {
              "--speed": `${speed}s`,
              "--glow-hue": hue,
              "--glow-base": `hsl(${hue}, 100%, 65%)`,
            } as CSSProperties
          }
        >
          {/* HEADER */}
          <div className="flex items-center justify-between mb-3">
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
                <div className="flex items-center gap-3">
                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                    {postState.authorName || ""}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {postState.authorUserId ? "@" + postState.authorUserId : ""}
                  </p>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {dayjs(postState.createdAt).locale(i18n.language).fromNow()}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              {/* GRAPH BUTTON */}
              <button
                onClick={() => {
                  if (!showGraph) {
                    // opening graph → reset key
                    setGraphKey(Date.now());
                  }
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
                        className="absolute right-0 mt-2 w-44 z-20 
              rounded-md overflow-hidden shadow-lg
              bg-white dark:bg-neutral-800 
              border border-gray-200 dark:border-gray-700"
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
          {!isComment && (
            <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100 whitespace-normal break-words break-all">
              {postState.title}
            </h2>
          )}

          {/* CATEGORIES */}
          {Array.isArray(postState.categories) &&
            postState.categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 mb-1">
                {postState.categories.map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/category/${encodeURIComponent(cat.name)}`}
                    scroll={false}
                    className="text-xs px-2 py-1 rounded-md bg-blue-100 text-blue-700 
                  dark:bg-blue-600/50 dark:text-blue-200"
                  >
                    {i18n.language === "ja"
                      ? cat.jname
                      : i18n.language === "my"
                      ? cat.myname
                      : cat.name}
                  </Link>
                ))}
              </div>
            )}

          {/* CONTENT */}
          <motion.div
            animate={{ height: targetHeight }}
            initial={{ height: 0 }}
            transition={{ duration: measureDone ? 0.25 : 0 }}
            className="mt-2 overflow-hidden text-gray-900 dark:text-gray-100"
            style={{ lineHeight: `${LINE_HEIGHT}px` }}
          >
            <div
              ref={contentRef}
              className="mt-2"
              style={{
                opacity: measureDone ? 1 : 0,
                pointerEvents: measureDone ? "auto" : "none",
              }}
            >
              <MathRenderer html={postState.content ?? ""} />
            </div>
          </motion.div>

          {/* SHOW MORE / LESS */}
          {!isComment && shouldTruncate && (
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
            <div className="flex-1 flex items-center gap-5">
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

              {!isSingle && !isComment && (
                <Link
                  href={`/posts/${postState._id}#comments`}
                  scroll={false}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <MessageCircle size={18} />
                  {postState.commentCount ?? 0}
                </Link>
              )}

              {!isComment && (
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <Share2 size={18} /> {t("share") || "Share"}
                </button>
              )}
            </div>
              
            <div>
              {postState.edited
                ? `(edited ${dayjs(postState.editedAt)
                    .locale(i18n.language)
                    .fromNow()})`
                : ""}
            </div>
          </div>
        </WrapperTag>
      </motion.div>

      <SharePostModal
        open={shareOpen}
        postUrl={`${
          typeof window !== "undefined" ? window.location.origin : ""
        }/posts/${postState._id}`}
        onCancel={() => setShareOpen(false)}
      />

      <FullScreenPortal>
        <AnimatePresence>
          {imageNode && (
            <motion.div
              key="img"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-[999999] flex justify-center items-center px-[10vw] py-[10vh]"
              onClick={() => setImageNode(null)}
            >
              <div
                ref={(container) => {
                  if (container && imageNode) {
                    container.innerHTML = "";
                    container.appendChild(imageNode);
                  }
                }}
                className="w-full h-full flex items-center justify-center"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </FullScreenPortal>

      <FullScreenPortal>
        {showGraph && (
          <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center p-6">
            <div
              className="relative max-w-4xl w-full h-[80vh] rounded-lg shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()} // prevent closing on click inside
            >
              {/* Close button */}
              <button
                onClick={() => setShowGraph(false)}
                className="absolute top-3 right-3 z-[50] w-12 h-12 flex items-center justify-center rounded-full bg-black/70 text-white text-2xl font-bold hover:bg-black/90 transition"
                title="Close"
              >
                ×
              </button>

              {/* Graph container */}
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
