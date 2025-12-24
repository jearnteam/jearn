"use client";

import {
  ArrowBigUp,
  MessageCircle,
  MessageSquarePlus,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { PostTypes, type Post } from "@/types/post";
import clsx from "clsx";
import dayjs from "@/lib/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import i18n from "@/lib/i18n";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";

dayjs.extend(relativeTime);

export default function PostFooter({
  post,
  setPost, // ← now optional
  onUpvote,
  isSingle,
  onShare,
  onAnswer,
}: {
  post: Post;
  setPost?: React.Dispatch<React.SetStateAction<Post>>;
  onUpvote?: (id: string, userId: string, txId?: string) => Promise<any>;
  isSingle?: boolean;
  onShare: () => void;
  onAnswer: () => void;
}) {
  const { user } = useCurrentUser();
  const userId = user?._id;
  const { t } = useTranslation();

  /* -------------------------------------------------
   * LOCAL RENDER STATE (memo / safety)
   * ------------------------------------------------- */
  const [localCount, setLocalCount] = useState(post.upvoteCount ?? 0);
  const [localUpvoted, setLocalUpvoted] = useState(
    !!userId && post.upvoters?.includes(userId)
  );

  useEffect(() => {
    setLocalCount(post.upvoteCount ?? 0);
    setLocalUpvoted(!!userId && post.upvoters?.includes(userId));
  }, [post.upvoteCount, post.upvoters, userId]);

  function handleUpvote(e: React.MouseEvent) {
    e.stopPropagation();
    if (!userId || !onUpvote) return;

    // ✅ optimistic local UI
    setLocalCount((c) => c + (localUpvoted ? -1 : 1));
    setLocalUpvoted((v) => !v);

    // ✅ optimistic parent state (ONLY if available)
    if (setPost) {
      setPost((prev) => {
        const hasUpvoted = prev.upvoters?.includes(userId);

        return {
          ...prev,
          upvoteCount:
            (prev.upvoteCount ?? 0) + (hasUpvoted ? -1 : 1),
          upvoters: hasUpvoted
            ? prev.upvoters?.filter((id) => id !== userId)
            : [...(prev.upvoters ?? []), userId],
        };
      });
    }

    // 🔥 fire-and-forget
    onUpvote(post._id, userId);
  }

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3 text-sm text-gray-600 dark:text-gray-400">
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
          {!isSingle &&
            !post.parentId &&
            post.postType !== PostTypes.QUESTION && (
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
          {!isSingle &&
            !post.parentId &&
            post.postType === PostTypes.QUESTION && (
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
          {!post.parentId && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Share2 size={18} />
              <span>{t("share") || "Share"}</span>
            </button>
          )}
        </div>

        {/* CENTER: ANSWER */}
        {post.postType === PostTypes.QUESTION && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAnswer?.();
            }}
            className="absolute left-1/2 -translate-x-1/2 border border-slate-600 px-3 py-1 rounded text-xs hover:bg-slate-100 dark:hover:bg-neutral-800"
          >
            回答する
          </button>
        )}

        {/* RIGHT: EDITED INFO */}
        {post.edited && post.editedAt && (
          <span className="text-xs text-gray-500 dark:text-gray-500">
            (edited {dayjs(post.editedAt).locale(i18n.language).fromNow()})
          </span>
        )}
      </div>
    </div>
  );
}
