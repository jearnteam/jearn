"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
} from "react";
import { MoreVertical, ArrowBigUp, MessageCircle, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { MathRenderer } from "@/components/math/MathRenderer";
import Link from "next/link";
import SharePostModal from "@/components/common/SharePostModal";
import type { Post } from "@/types/post";
import { rememberTx } from "@/lib/recentTx";

dayjs.extend(relativeTime);

interface PostItemProps {
  post: Post;
  onEdit?: (post: Post) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onUpvote?: (id: string, userId: string, txId?: string) => Promise<any>;
  fullView?: boolean;
}

const LINE_HEIGHT = 20;
const COLLAPSED_LINES = 5;
const LINE_THRESHOLD = 10;

export default function PostItem({
  post,
  onEdit,
  onDelete,
  onUpvote,
  fullView = false,
}: PostItemProps) {
  const { user } = useCurrentUser();
  const userId = user?.uid ?? "";

  const [postState, setPostState] = useState(post);

  // ✅ Keep in sync with server/SSE updates
  useEffect(() => {
    setPostState(post);
  }, [post]);

  const hasUpvoted = userId && postState.upvoters?.includes(userId);

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(fullView);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [measureDone, setMeasureDone] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const defaultAvatar = "/default-avatar.png";
  const realAvatarUrl =
    postState.authorAvatar && postState.authorAvatar.startsWith("http")
      ? postState.authorAvatar
      : `/api/user/avatar/${postState.authorId}`;

  const [avatarLoaded, setAvatarLoaded] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.src = realAvatarUrl;
    img.onload = () => setAvatarLoaded(true);
    img.onerror = () => setAvatarLoaded(true);
  }, [realAvatarUrl]);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (el) {
      setContentHeight(el.scrollHeight);
      setMeasureDone(true);
    }
  }, [postState.content]);

  const shouldTruncate =
    contentHeight && contentHeight > LINE_HEIGHT * LINE_THRESHOLD;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleEdit = async () => {
    setMenuOpen(false);
    await onEdit?.(postState);
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (postState._id) await onDelete?.(postState._id);
  };

  const [pending, setPending] = useState(false);

  const handleUpvote = useCallback(async () => {
    if (!userId || !postState._id || pending) return;
    setPending(true);

    const alreadyUpvoted = postState.upvoters?.includes(userId);
    const txId =
      globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    rememberTx(txId);

    // Optimistic UI update
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
    } catch (err) {
      console.error("❌ Upvote failed:", err);
      // Revert on failure
      setPostState((prev) => ({
        ...prev,
        upvoteCount: alreadyUpvoted
          ? prev.upvoteCount + 1
          : prev.upvoteCount - 1,
        upvoters: alreadyUpvoted
          ? [...prev.upvoters, userId]
          : prev.upvoters.filter((id) => id !== userId),
      }));
    } finally {
      setPending(false);
    }
  }, [userId, postState._id, postState.upvoters, pending, onUpvote]);

  const toggleExpand = () => setExpanded((prev) => !prev);

  const isComment = !!post.parentId;
  const WrapperTag: any = fullView || isComment ? "div" : "li";

  return (
    <>
      <WrapperTag
        className={`${
          fullView
            ? "bg-white dark:bg-neutral-900 border border-gray-300 dark:border-gray-700 rounded-xl p-6 list-none"
            : "bg-white dark:bg-neutral-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 list-none"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center mb-3">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-300 dark:border-gray-700 mr-3">
              {!avatarLoaded && (
                <img
                  src={defaultAvatar}
                  alt="Default avatar"
                  className="w-8 h-8 object-cover opacity-80"
                />
              )}
              <img
                src={realAvatarUrl}
                alt={postState.authorName || "User avatar"}
                className={`w-8 h-8 object-cover absolute top-0 left-0 transition-opacity duration-300 
                  ${avatarLoaded ? "opacity-100" : "opacity-0"}`}
              />
            </div>
            <div>
              <p className="font-semibold text-gray-800 dark:text-gray-200">
                {postState.authorName || "Anonymous"}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {postState.createdAt
                  ? dayjs(postState.createdAt).fromNow()
                  : "Just now"}
              </p>
            </div>
          </div>

          {userId === postState.authorId && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
              >
                <MoreVertical size={20} />
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="absolute right-0 mt-2 w-40 z-20 rounded-md bg-white dark:bg-neutral-800 shadow-lg border border-gray-200 dark:border-gray-700"
                  >
                    <button
                      onClick={handleEdit}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700 text-red-600"
                    >
                      🗑 Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* ✅ Title */}
        {!isComment && (
          <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
            {postState.title || "Untitled"}
          </h2>
        )}

        {/* ✅ 🆕 Category Badges */}
        {Array.isArray(postState.categories) &&
          postState.categories.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 mb-1">
              {postState.categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/category/${encodeURIComponent(cat)}`}
                  className="text-xs px-2 py-1 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-600/50 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-800/60 transition"
                >
                  {cat}
                </Link>
              ))}
            </div>
          )}

        {/* ✅ Content */}
        {postState.content?.trim() ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height:
                fullView || expanded || !shouldTruncate
                  ? "auto"
                  : LINE_HEIGHT * COLLAPSED_LINES,
              opacity: 1,
            }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden mt-2 text-gray-900 dark:text-gray-100 relative"
            ref={contentRef}
            style={{
              lineHeight: `${LINE_HEIGHT}px`,
              visibility: measureDone ? "visible" : "hidden",
            }}
          >
            <MathRenderer html={postState.content ?? ""} />
          </motion.div>
        ) : null}

        {!fullView && !isComment && shouldTruncate && (
          <button
            onClick={toggleExpand}
            className="mt-2 text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            {expanded ? "Show Less ▲" : "Show More ▼"}
          </button>
        )}

        {/* Footer */}
        <div className="mt-4 flex items-center space-x-6 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-3">
          <button
            onClick={handleUpvote}
            disabled={pending}
            className={`flex items-center gap-1 transition-colors ${
              pending
                ? "opacity-60 cursor-not-allowed"
                : hasUpvoted
                ? "text-blue-600 dark:text-blue-400"
                : "hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            <ArrowBigUp size={18} />
            <span>{postState.upvoteCount ?? 0}</span>
          </button>

          {!fullView && !isComment && (
            <Link
              href={`/posts/${postState._id}#comments`}
              onClick={() => {
                sessionStorage.setItem(
                  "home-scroll-position",
                  window.scrollY.toString()
                );
              }}
              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <MessageCircle size={18} />
              <span>{postState.commentCount ?? 0}</span>
            </Link>
          )}

          {!isComment && (
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Share2 size={18} /> <span>Share</span>
            </button>
          )}
        </div>
      </WrapperTag>

      {/* Share Modal */}
      <SharePostModal
        open={shareOpen}
        postUrl={`${
          typeof window !== "undefined" ? window.location.origin : ""
        }/posts/${postState._id}`}
        onCancel={() => setShareOpen(false)}
      />
    </>
  );
}
