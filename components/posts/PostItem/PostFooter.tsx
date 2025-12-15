"use client";

import { ArrowBigUp, MessageCircle, Share2 } from "lucide-react";
import Link from "next/link";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePostUpvote } from "./usePostUpvote";
import { PostTypes, type Post } from "@/types/post";
import clsx from "clsx";
import dayjs from "@/lib/dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import i18n from "@/lib/i18n";

dayjs.extend(relativeTime);

export default function PostFooter({
  post,
  setPost,
  onUpvote,
  isSingle,
  onShare,
}: {
  post: Post;
  setPost: React.Dispatch<React.SetStateAction<Post>>;
  onUpvote?: (id: string, userId: string, txId?: string) => Promise<any>;
  isSingle?: boolean;
  onShare: () => void;
}) {
  const { user } = useCurrentUser();
  const userId = user?._id;

  const { upvote, pending } = usePostUpvote(post, setPost, onUpvote);
  const hasUpvoted = userId && post.upvoters?.includes(userId);

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-3 text-sm text-gray-600 dark:text-gray-400">
      <div className="flex items-center justify-between">
        {/* LEFT: ACTIONS */}
        <div className="flex items-center gap-6">
          {/* UPVOTE */}
          <button
            onClick={() => upvote(userId)}
            disabled={pending}
            className={clsx(
              "flex items-center gap-1 transition-colors",
              hasUpvoted
                ? "text-blue-600 dark:text-blue-400"
                : "hover:text-blue-600 dark:hover:text-blue-400"
            )}
          >
            <ArrowBigUp size={18} />
            <span>{post.upvoteCount ?? 0}</span>
          </button>

          {/* COMMENTS */}
          {!isSingle &&
            !post.parentId &&
            post.postType !== PostTypes.QUESTION && (
              <Link
                href={`/posts/${post._id}#comments`}
                scroll={false}
                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                <MessageCircle size={18} />
                <span>{post.commentCount ?? 0}</span>
              </Link>
            )}

          {/* SHARE */}
          {!post.parentId && (
            <button
              onClick={onShare}
              className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              <Share2 size={18} />
              <span>Share</span>
            </button>
          )}
        </div>

        {/* RIGHT: EDITED */}
        {post.edited && post.editedAt && (
          <span className="text-xs text-gray-500 dark:text-gray-500">
            (edited {dayjs(post.editedAt).locale(i18n.language).fromNow()})
          </span>
        )}
      </div>
    </div>
  );
}
