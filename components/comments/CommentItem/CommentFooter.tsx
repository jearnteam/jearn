"use client";

import { useState, useEffect } from "react";
import { ArrowBigUp, Reply } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";
import clsx from "clsx";
import { rememberTx } from "@/lib/recentTx";
import type { Post } from "@/types/post";

export default function CommentFooter({
  comment,
  onUpvote,
  onReply,
}: {
  comment: Post;
  onUpvote: (id: string, userId: string, txId?: string) => Promise<void>;
  onReply?: () => void;
}) {
  const { user } = useCurrentUser();
  const userId = user?._id;
  const { t } = useTranslation();

  const upvoters = (comment.upvoters ?? []).map(String);
  const [localCount, setLocalCount] = useState(comment.upvoteCount ?? 0);
  const [localUpvoted, setLocalUpvoted] = useState(
    !!userId && upvoters.includes(userId)
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setLocalCount(comment.upvoteCount ?? 0);
    setLocalUpvoted(!!userId && upvoters.includes(userId));
  }, [comment.upvoteCount, comment.upvoters, userId]);

  const handleUpvote = async () => {
    if (!userId || pending) return;
    setPending(true);

    const txId = crypto.randomUUID();
    rememberTx(txId);

    // Optimistic update
    setLocalCount((c) => c + (localUpvoted ? -1 : 1));
    setLocalUpvoted((v) => !v);

    try {
      await onUpvote(comment._id, userId, txId);
    } catch (err) {
      console.error("Upvote failed", err);
      // Rollback
      setLocalCount((c) => c + (localUpvoted ? 1 : -1));
      setLocalUpvoted((v) => !v);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
      {/* Upvote */}
      <button
        onClick={handleUpvote}
        disabled={!userId || pending}
        className={clsx(
          "flex items-center gap-1 transition-colors px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800",
          localUpvoted
            ? "text-blue-600 dark:text-blue-400 font-medium"
            : "hover:text-blue-600 dark:hover:text-blue-400"
        )}
      >
        <ArrowBigUp size={18} className={localUpvoted ? "fill-current" : ""} />
        <span>{localCount}</span>
      </button>

      {/* Reply */}
      {onReply && (
        <button
          onClick={onReply}
          className="flex items-center gap-1.5 transition-colors px-1.5 py-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-blue-600 dark:hover:text-blue-400"
        >
          <Reply size={16} />
          <span>{t("reply")}</span>
        </button>
      )}
    </div>
  );
}
