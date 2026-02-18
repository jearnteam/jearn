"use client";

import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import type { Post } from "@/types/post";
import CommentHeader from "./CommentHeader";
import CommentFooter from "./CommentFooter";
import PostContent from "@/components/posts/PostItem/PostContent";
import EditCommentModal from "@/components/comments/EditCommentModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { VirtuosoHandle } from "react-virtuoso";

export default function CommentItem({
  comment,
  isReply,
  onEdit,
  onDelete,
  onUpvote,
  onReply,
  scrollContainerRef, // ✅ 親から受け取る
}: {
  comment: Post;
  isReply: boolean;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpvote: (id: string, userId: string, txId?: string) => Promise<void>;
  onReply?: (id: string, content: string) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  /* Save edit */
  const handleEditSave = async (newContent: string) => {
    await onEdit(comment._id, newContent);
    setShowEditModal(false);
  };

  return (
    <>
      <div ref={wrapperRef}>
        <div
          className={`
            group relative rounded-xl border 
            bg-white dark:bg-neutral-900 
            border-gray-200 dark:border-neutral-800 
            shadow-sm px-4 py-3 transition-all 
            hover:border-blue-200 dark:hover:border-blue-900/30
            
          `}
        >
          <CommentHeader
            comment={comment}
            onEditClick={() => setShowEditModal(true)}
            onDeleteClick={() => setShowDeleteModal(true)}
          />

          {/* 📝 Reuse PostContent logic (images, math, collapse) */}
          <div className="">
            <PostContent
              post={comment}
              wrapperRef={wrapperRef}
              /* TODO: 以下のvirtuosoに必要な項目を正しく追加する */
              // scrollContainerRef={scrollContainerRef}
              index={0}
              virtuosoRef={useRef<VirtuosoHandle | null>(null)}
            />

            <CommentFooter
              comment={comment}
              onUpvote={onUpvote}
              onReply={
                onReply
                  ? () => onReply(comment._id, comment.content ?? "")
                  : undefined
              }
            />
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && (
          <EditCommentModal
            comment={{ _id: comment._id, content: comment.content ?? "" }}
            onClose={() => setShowEditModal(false)}
            onSave={handleEditSave}
          />
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <DeleteConfirmModal
            open={showDeleteModal}
            onCancel={() => setShowDeleteModal(false)}
            onConfirm={async () => {
              await onDelete(comment._id);
              setShowDeleteModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}
