"use client";

import { useEffect, useRef } from "react";
import { MathRenderer } from "@/components/math/MathRenderer";
import { ArrowBigUp, X } from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { PostTypes } from "@/types/post";

dayjs.extend(relativeTime);

interface CommentPopupData {
  _id: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string | Date;
  content: string;
  upvoteCount?: number;
  postType?: string;
  title?: string;
}

export default function CommentPopup({
  comment,
  onClose,
  onUpvote,
}: {
  comment: CommentPopupData;
  onClose: () => void;
  onUpvote: (id: string) => Promise<void>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  /* Close when clicking outside */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  const isAnswer =
    comment.postType &&
    comment.postType.toLowerCase() === PostTypes.ANSWER.toLowerCase();

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        ref={ref}
        className="bg-white dark:bg-neutral-900 w-[480px] max-h-[70vh] rounded-lg shadow-xl flex flex-col"
      >
        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <img
              src={comment.authorAvatar ?? "/default-avatar.png"}
              alt={comment.authorName}
              className="w-9 h-9 rounded-full border border-gray-300 dark:border-neutral-700"
            />

            <div>
              <p className="font-semibold">{comment.authorName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {comment.createdAt ? dayjs(comment.createdAt).fromNow() : ""}
              </p>
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-neutral-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* ================= SCROLLABLE CONTENT ================= */}
        <div className="flex-1 overflow-y-auto px-5 py-4 text-sm text-gray-800 dark:text-gray-200 flex flex-col gap-3">
          {isAnswer && comment.title && (
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {comment.title}
            </h3>
          )}
          {comment.content && <MathRenderer html={comment.content} />}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-neutral-800">
          <button
            onClick={() => onUpvote(comment._id)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
          >
            <ArrowBigUp size={18} />
            {comment.upvoteCount ?? 0}
          </button>
        </div>
      </div>
    </div>
  );
}
