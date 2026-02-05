"use client";

import {
  ArrowBigUp,
  MessageCircle,
  MessageSquarePlus,
  MessageSquareText,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PostTypes, type Post } from "@/types/post";
import clsx from "clsx";
import dayjs from "@/lib/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import i18n from "@/lib/i18n/index";
import { useTranslation } from "react-i18next";
import { useEffect, useState, useCallback } from "react";

dayjs.extend(relativeTime);

export default function PostFooter({
  post,
  setPost,
  onUpvote,
  isSingle,
  onShare,
  onAnswer,
}: {
  post: Post;
  setPost?: React.Dispatch<React.SetStateAction<Post | null>>;
  onUpvote?: (id: string, userId: string, txId?: string) => Promise<void>;
  isSingle?: boolean;

  /** Optional actions (safe defaults below) */
  onShare?: () => void;
  onAnswer?: () => void;
}) {
  const { user } = useCurrentUser();
  const userId = user?._id;
  const { t } = useTranslation();

  /* -------------------------------------------------
   * SAFE FALLBACK HANDLERS (do not remove)
   * ------------------------------------------------- */
  const safeShare = useCallback(() => {
    if (onShare) onShare();
  }, [onShare]);

  const safeAnswer = useCallback(() => {
    if (onAnswer) onAnswer();
  }, [onAnswer]);

  /* -------------------------------------------------
   * LOCAL RENDER STATE (optimistic)
   * ------------------------------------------------- */
  const upvoterIds = (post.upvoters ?? []).map(String);

  const [localCount, setLocalCount] = useState(post.upvoteCount ?? 0);
  const [localUpvoted, setLocalUpvoted] = useState(
    !!userId && upvoterIds.includes(userId)
  );

  useEffect(() => {
    setLocalCount(post.upvoteCount ?? 0);
    setLocalUpvoted(!!userId && upvoterIds.includes(userId));
  }, [post.upvoteCount, post.upvoters, userId]);

  function handleUpvote(e: React.MouseEvent) {
    e.stopPropagation();
    if (!userId || !onUpvote) return;

    // ✅ optimistic local UI
    setLocalCount((c) => c + (localUpvoted ? -1 : 1));
    setLocalUpvoted((v) => !v);

    // ✅ optimistic parent state (null-safe)
    if (setPost) {
      setPost((prev) => {
        if (!prev) return prev;

        const upvoters = (prev.upvoters ?? []).map(String);
        const hasUpvoted = upvoters.includes(userId);

        return {
          ...prev,
          upvoteCount: (prev.upvoteCount ?? 0) + (hasUpvoted ? -1 : 1),
          upvoters: hasUpvoted
            ? upvoters.filter((id) => id !== userId)
            : [...upvoters, userId],
        };
      });
    }

    // 🔥 fire-and-forget
    onUpvote(post._id, userId);
  }

  return (
    <>
      {/* CENTER: ANSWER */}
      {post.postType === PostTypes.QUESTION && post.authorId && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            safeAnswer();
          }}
          className="flex mx-auto mt-2 items-center border border-slate-600 px-3 py-1 rounded text-xs hover:bg-slate-100 dark:hover:bg-neutral-800"
        >
          <div className="inline-block pr-1 font-medium text-sm">回答する</div>
          <MessageSquareText size={20} className="inline-block text-red-400" />
        </button>
      )}
      <div className="mt-2 border-t border-gray-200 dark:border-gray-700 pt-3 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center justify-between relative">
          {/* LEFT: ACTIONS */}
          <div className="flex items-center gap-6">
            {/* UPVOTE */}
            <button
              onClick={handleUpvote}
              className={clsx(
                "flex items-center gap-1 transition-colors",
                localUpvoted
                  ? "text-blue-600 dark:text-blue-400"
                  : "hover:text-blue-600 dark:hover:text-blue-400"
              )}
            >
              <ArrowBigUp size={18} />
              <span>{localCount}</span>
            </button>

            {/* COMMENTS */}
            {!isSingle && post.postType !== PostTypes.QUESTION && (
              <Link
                href={`/posts/${post._id}?focus=comments`}
                scroll={false}
                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageCircle size={18} />
                <span>{post.commentCount ?? 0}</span>
              </Link>
            )}

            {/* ANSWERS */}
            {!isSingle && post.postType === PostTypes.QUESTION && (
              <Link
                href={`/posts/${post._id}`}
                scroll={false}
                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <MessageSquarePlus size={18} color="#c44" />
                <span>{post.commentCount ?? 0}</span>
              </Link>
            )}

            {/* SHARE */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                safeShare();
              }}
              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Share2 size={18} />
              <span>{t("share") || "Share"}</span>
            </button>
          </div>

          {/* RIGHT: EDITED INFO */}
          {post.edited && post.editedAt && (
            <span className="text-xs text-gray-500 dark:text-gray-500">
              (edited {dayjs(post.editedAt).locale(i18n.language).fromNow()})
            </span>
          )}
        </div>
      </div>
    </>
  );
}
