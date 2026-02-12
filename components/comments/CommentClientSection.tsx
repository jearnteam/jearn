"use client";

import { useState } from "react";
import CommentList from "./CommentList";
import CommentFormModal from "./CommentFormModal";
import type { Post } from "@/types/post";
import { useComments } from "@/features/comments/hooks/useComments";
import { useTranslation } from "react-i18next";
import { MessageSquarePlus } from "lucide-react";

export default function CommentClientSection({
  comments,
  postId,
  scrollContainerRef,
}: {
  comments: Post[];
  postId: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation();
  const [isCommentOpen, setIsCommentOpen] = useState(false);
  const { addComment } = useComments(comments, postId);

  const handleSubmitComment = async (content: string) => {
    await addComment(content);
    setIsCommentOpen(false);

    // Smooth scroll
    requestAnimationFrame(() => {
      const el = scrollContainerRef?.current;
      if (!el) return;
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    });
  };

  return (
    <section id="comments" className="space-y-6 mt-8">
      <div className="flex justify-between items-center border-b border-gray-200 dark:border-neutral-800 pb-3">
        <h3 className="text-xl font-bold flex items-center gap-2">
          {t("comments")}
          <span className="text-sm font-normal text-gray-500 bg-gray-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
            {comments.length}
          </span>
        </h3>

        <button
          onClick={() => setIsCommentOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-sm hover:shadow-md transition"
        >
          <MessageSquarePlus size={18} />
          {t("addComment")}
        </button>
      </div>

      <CommentList initialComments={comments} postId={postId} />

      {isCommentOpen && (
        <CommentFormModal
          parentId={postId}
          onSubmitted={handleSubmitComment}
          onClose={() => setIsCommentOpen(false)}
        />
      )}
    </section>
  );
}