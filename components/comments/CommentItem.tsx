"use client";

import { useRef, useState, useEffect } from "react";
import dayjs from "@/lib/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import i18n from "@/lib/i18n/index";
import { MoreVertical, ArrowBigUp, Reply } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { MathRenderer } from "@/components/math/MathRenderer";
import type { Post } from "@/types/post";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { rememberTx } from "@/lib/recentTx";
import EditCommentModal from "@/components/comments/EditCommentModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { t } from "i18next";

dayjs.extend(relativeTime);

const COLLAPSED_HEIGHT = 66;

/* ============================================
   Scroll Parent Helper (TS-SAFE)
=============================================== */
type ScrollContainer =
  | { type: "window"; el: Window }
  | { type: "element"; el: HTMLElement };

function getScrollParent(element: HTMLElement | null): ScrollContainer {
  if (!element) return { type: "window", el: window };

  let parent: HTMLElement | null = element.parentElement;

  while (parent) {
    const style = window.getComputedStyle(parent);
    if (style.overflowY === "auto" || style.overflowY === "scroll") {
      return { type: "element", el: parent };
    }
    parent = parent.parentElement;
  }

  return { type: "window", el: window };
}

export default function CommentItem({
  comment,
  isReply,
  onEdit,
  onDelete,
  onUpvote,
  onReply,
}: {
  comment: Post;
  isReply: boolean;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpvote: (id: string, userId: string, txId?: string) => Promise<void>;
  onReply?: (id: string, content: string) => void;
}) {
  const { user } = useCurrentUser();
  const userId = user?._id ?? "";

  const hasUpvoted = userId && comment.upvoters?.includes(userId);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pending, setPending] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [height, setHeight] = useState<number | "auto">("auto");
  const [measuredHeight, setMeasuredHeight] = useState<number>(0);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const [isReady, setIsReady] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLDivElement>(null);

  const avatarUrl =
    comment.authorAvatar?.startsWith("http") ||
    comment.authorAvatar?.startsWith("/api")
      ? comment.authorAvatar
      : comment.authorId
      ? `/api/user/avatar/${comment.authorId}`
      : "/default-avatar.png";

  /* Measure content height */
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const full = el.scrollHeight;
    setMeasuredHeight(full);
    setContentHeight(full);
    setIsReady(true);

    // if collapsed, enforce collapsed height
    if (!expanded) {
      setHeight(COLLAPSED_HEIGHT);
    } else {
      setHeight("auto");
    }
  }, [comment.content, expanded]);

  const canExpand = contentHeight && contentHeight > COLLAPSED_HEIGHT;

  /* Close menu on outside click */
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  /* Upvote */
  const handleUpvote = async () => {
    if (!userId || !comment._id || pending) return;
    setPending(true);

    const txId =
      globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    rememberTx(txId);

    try {
      await onUpvote(comment._id, userId, txId);
    } catch (err) {
      console.error("❌ Upvote failed:", err);
    } finally {
      setPending(false);
    }
  };

  /* Save edit */
  const handleEditSave = async (newContent: string) => {
    await onEdit(comment._id, newContent);
    setShowEditModal(false);
  };

  /* ============================================
     Show Less → Scroll to top of comment
  ============================================ */
  /* ============================================
   Show Less → Scroll to top of comment (improved)
=============================================== */
  const toggleExpand = () => {
    const el = contentRef.current;
    if (!el) return;

    if (!expanded) {
      // EXPAND
      const full = el.scrollHeight;
      setHeight(full);
      setExpanded(true);

      // after animation ends → use auto height
      setTimeout(() => setHeight("auto"), 250);
    } else {
      // COLLAPSE
      const full = el.scrollHeight;
      setHeight(full); // set current height first

      requestAnimationFrame(() => {
        setHeight(COLLAPSED_HEIGHT);
        setExpanded(false);
      });
    }

    /* ---------------------------------------
     SCROLL TO TOP BEFORE COLLAPSING (like PostItem)
  ---------------------------------------- */
    if (expanded) {
      const elBox = commentRef.current;
      if (!elBox) return;

      const rect = elBox.getBoundingClientRect();
      const isTopVisible = rect.top >= 0;

      if (!isTopVisible) {
        window.scrollTo({
          top: window.scrollY + rect.top - 80,
        });
      }
    }
  };

  return (
    <>
      <div
        ref={commentRef}
        className={`
    group relative rounded-xl border 
    bg-white dark:bg-neutral-900 
    border-gray-200 dark:border-neutral-700 
    shadow-sm px-4 py-3 transition-all 
    hover:shadow-md hover:border-gray-300 dark:hover:border-neutral-600
    ${isReply ? "ml-4" : ""}
  `}
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <img
              src={avatarUrl}
              alt=""
              className="w-9 h-9 rounded-full border border-gray-300 dark:border-neutral-600 object-cover"
            />

            {/* Name + timestamp */}
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {comment.authorName || "Anonymous"}
                </p>

                {comment.authorUniqueId && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    @{comment.authorUniqueId}
                  </p>
                )}
              </div>

              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {dayjs(comment.createdAt).locale(i18n.language).fromNow()}
              </p>
            </div>
          </div>

          {/* Menu */}
          {userId === comment.authorId && (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-neutral-700"
              >
                <MoreVertical size={18} />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="
              absolute right-0 mt-1 w-36 rounded-md shadow-lg 
              bg-white dark:bg-neutral-800 
              border border-gray-200 dark:border-neutral-700 z-20
            "
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setShowEditModal(true);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-neutral-700"
                    >
                      ✏️ {t("edit") || "Edit"}
                    </button>

                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="
                w-full text-left px-4 py-2 text-red-600 
                hover:bg-gray-100 dark:hover:bg-neutral-700
              "
                    >
                      🗑 {t("delete") || "Delete"}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Content */}
        {comment.content?.trim() ? (
          <motion.div
            animate={{ height }}
            transition={{ duration: 0.25 }}
            className="relative overflow-hidden text-[15px] leading-relaxed text-gray-800 dark:text-gray-200 mt-2"
          >
            <div
              ref={contentRef}
              className="prose prose-sm dark:prose-invert max-w-none 
              break-words whitespace-pre-wrap"
            >
              <MathRenderer html={comment.content} />
            </div>

            {!expanded && measuredHeight > COLLAPSED_HEIGHT && (
              <div
                className="absolute bottom-0 left-0 w-full h-10 
                    bg-gradient-to-t from-white dark:from-neutral-900 
                    to-transparent pointer-events-none"
              />
            )}
          </motion.div>
        ) : null}

        {canExpand && isReady && (
          <button
            onClick={toggleExpand}
            className="text-xs font-medium text-blue-600 dark:text-blue-400 
             hover:underline mt-1"
          >
            {expanded ? "Show Less ▲" : "Show More ▼"}
          </button>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center gap-5 text-xs">
          {/* Upvote */}
          <button
            onClick={handleUpvote}
            disabled={pending}
            className={`flex items-center gap-1 transition-colors ${
              pending
                ? "opacity-50 cursor-not-allowed"
                : hasUpvoted
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
            }`}
          >
            <ArrowBigUp size={16} />
            {comment.upvoteCount ?? 0}
          </button>

          {/* Reply */}
          {onReply && (
            <button
              onClick={() => onReply(comment._id, comment.content ?? "")}
              className="flex items-center gap-1 text-gray-500 dark:text-gray-400 
                 hover:text-blue-600 dark:hover:text-blue-400"
            >
              <Reply size={12} />
              <span className="text-xs">{t("reply") || "reply"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <EditCommentModal
            comment={{ _id: comment._id, content: comment.content ?? "" }}
            onClose={() => setShowEditModal(false)}
            onSave={handleEditSave}
          />
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <DeleteConfirmModal
            open={showDeleteModal}
            onCancel={() => setShowDeleteModal(false)}
            onConfirm={async () => {
              await onDelete(comment._id);
              setShowDeleteModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
