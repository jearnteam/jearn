"use client";

import { useEffect, useRef } from "react";
import type { Post } from "@/types/post";
import PostContent from "../posts/PostItem/PostContent";
import PollView from "../posts/PostItem/PollView";
import { PostTypes } from "@/types/post";
import { ArrowBigUp } from "lucide-react";
import dayjs from "dayjs";

export default function PostPopup({
  post,
  onClose,
  onUpvote,
  onVote,
}: {
  post: Post;
  onClose: () => void;
  onUpvote?: (id: string) => Promise<void>;
  onVote?: (postId: string, optionId: string) => Promise<any>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        ref={ref}
        className="bg-white dark:bg-neutral-900 w-[680px] max-h-[80vh] rounded-xl shadow-2xl flex flex-col"
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold">{post.title}</h2>
            <p className="text-xs text-gray-500">
              {dayjs(post.createdAt).fromNow()}
            </p>
          </div>

          <button onClick={onClose} className="text-xl hover:text-red-500">
            ×
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <PostContent
            post={post}
            wrapperRef={{ current: null }}
            disableCollapse
          />

          {post.postType === PostTypes.POLL && post.poll && onVote && (
            <PollView post={post} onVote={onVote} />
          )}
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-800 flex-shrink-0">
          <button
            onClick={() => onUpvote?.(post._id)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ArrowBigUp size={18} />
            {post.upvoteCount ?? 0}
          </button>
        </div>
      </div>
    </div>
  );
}
