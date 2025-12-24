"use client";

import { useEffect, useRef } from "react";
import { MathRenderer } from "@/components/math/MathRenderer";
import { ArrowBigUp } from "lucide-react";
import dayjs from "dayjs";

interface CommentPopupData {
  _id: string;
  authorName: string;
  authorAvatar?: string;
  createdAt: string | Date;
  content: string;
  upvoteCount?: number;
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
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        ref={ref}
        className="bg-white dark:bg-neutral-900 w-[480px] max-h-[70vh] overflow-y-auto rounded-lg shadow-xl p-5 flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <img
            src={comment.authorAvatar ?? "/default-avatar.png"}
            alt={comment.authorName}
            className="w-9 h-9 rounded-full border border-gray-300 dark:border-neutral-700"
          />

          <div>
            <p className="font-semibold">{comment.authorName}</p>
            <p className="text-xs text-gray-500">
              {dayjs(comment.createdAt).fromNow()}
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="text-sm text-gray-800 dark:text-gray-200">
          <MathRenderer html={comment.content} />
        </div>

        {/* Upvote */}
        <button
          onClick={() => onUpvote(comment._id)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
        >
          <ArrowBigUp size={18} />
          {comment.upvoteCount ?? 0}
        </button>
      </div>
    </div>
  );
}
