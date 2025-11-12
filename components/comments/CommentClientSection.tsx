// components/comments/CommentClientSection.tsx
"use client";

import { useState } from "react";
import CommentList from "./CommentList";
import CommentFormModal from "./CommentFormModal";
import type { Post } from "@/types/post";
import { useComments } from "@/features/comments/hooks/useComments";

export default function CommentClientSection({
  comments,
  postId,
}: {
  comments: Post[];
  postId: string;
}) {
  const [isCommentOpen, setIsCommentOpen] = useState(false);

  const { addComment } = useComments(comments, postId);

  const handleSubmitComment = async (content: string) => {
    await addComment(content);
    setIsCommentOpen(false);
  };

  return (
    <section id="comments" className="space-y-5">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Comments</h3>
        <button
          onClick={() => setIsCommentOpen(true)}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          + Add Comment
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
