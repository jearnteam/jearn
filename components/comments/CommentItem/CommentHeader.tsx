"use client";

import Link from "next/link";
import dayjs from "@/lib/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import i18n from "@/lib/i18n/index";
import { MoreVertical, Trash2, Edit2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Post } from "@/types/post";
import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

dayjs.extend(relativeTime);

const CDN = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

function resolveAvatar(comment: Post) {
  if (comment.authorAvatar) return comment.authorAvatar;
  if (comment.authorId && comment.authorAvatarUpdatedAt) {
    return `${CDN}/avatars/${comment.authorId}.webp?t=${new Date(
      comment.authorAvatarUpdatedAt
    ).getTime()}`;
  }
  return "/default-avatar.png";
}

export default function CommentHeader({
  comment,
  onEditClick,
  onDeleteClick,
}: {
  comment: Post;
  onEditClick: () => void;
  onDeleteClick: () => void;
}) {
  const { user } = useCurrentUser();
  const { t } = useTranslation();
  const isSelf = user?._id === comment.authorId;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const avatar = resolveAvatar(comment);
  const authorName = comment.authorName || "Anonymous";

  // Close menu on outside click
  useEffect(() => {
    function close(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="flex justify-between items-start mb-2">
      <Link href={`/profile/${comment.authorId}`} scroll={false}>
        <div className="flex items-center gap-3">
          <img
            src={avatar}
            onError={(e) => {
              e.currentTarget.src = "/default-avatar.png";
            }}
            className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-neutral-800"
            loading="lazy"
            alt={`${authorName} avatar`}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {authorName}
              </p>
              {comment.authorUniqueId && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  @{comment.authorUniqueId}
                </p>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {dayjs(comment.createdAt).locale(i18n.language).fromNow()}
            </p>
          </div>
        </div>
      </Link>

      {/* Menu */}
      {isSelf && (
        <div ref={menuRef} className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
          >
            <MoreVertical size={16} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.1 }}
                className="
                  absolute right-0 mt-1 w-32 rounded-lg shadow-xl 
                  bg-white dark:bg-neutral-900 
                  border border-gray-200 dark:border-neutral-800 z-20 overflow-hidden
                "
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onEditClick();
                  }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                >
                  <Edit2 size={14} />
                  {t("edit")}
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDeleteClick();
                  }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                >
                  <Trash2 size={14} />
                  {t("delete")}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
