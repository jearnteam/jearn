"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import CommentItem from "./CommentItem/index";
import CommentForm from "./CommentForm";
import { useComments } from "@/features/comments/hooks/useComments";
import { buildCommentTree } from "@/lib/buildCommentTree";
import type { Post } from "@/types/post";

interface Props {
  initialComments: Post[];
  postId: string;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>; // ✅ Add prop
}

export default function CommentList({
  initialComments,
  postId,
  scrollContainerRef,
}: Props) {
  const { comments, editComment, deleteComment, upvoteComment, addReply } =
    useComments(initialComments, postId);

  const tree = buildCommentTree(comments);

  const [replyTarget, setReplyTarget] = useState<{
    parentId: string;
    replyTo: string | null;
  } | null>(null);

  const handleStartReply = (parentId: string, replyTo: string | null) => {
    setReplyTarget({ parentId, replyTo });
  };

  const handleCancelReply = () => setReplyTarget(null);

  const handleSubmitReply = async (content: string) => {
    if (!replyTarget) return;
    await addReply(replyTarget.parentId, replyTarget.replyTo, content);
    setReplyTarget(null);
  };

  return (
    <div className="space-y-4">
      {tree.map((node) => (
        <CommentNode
          key={node._id}
          node={node}
          depth={0}
          onEdit={editComment}
          onDelete={deleteComment}
          onUpvote={upvoteComment}
          onReply={handleStartReply}
          replyTarget={replyTarget}
          onCancelReply={handleCancelReply}
          onSubmitReply={handleSubmitReply}
          scrollContainerRef={scrollContainerRef}
        />
      ))}
    </div>
  );
}

/* ==========================
   Recursive CommentNode
   ========================== */
function CommentNode({
  node,
  depth,
  onEdit,
  onDelete,
  onUpvote,
  onReply,
  replyTarget,
  onCancelReply,
  onSubmitReply,
  scrollContainerRef,
}: {
  node: Post & { children?: Post[] };
  depth: number;
  onEdit: (id: string, content: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpvote: (id: string, userId: string) => Promise<void>;
  onReply: (parentId: string, replyTo: string | null) => void;
  replyTarget: { parentId: string; replyTo: string | null } | null;
  onCancelReply: () => void;
  onSubmitReply: (content: string) => Promise<void>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div className={`mt-4 ${depth > 0 ? "relative pl-4 md:pl-6" : ""}`}>
      {/* 🧵 Thread line: インデントされた範囲の左端に線を引く */}
      {depth > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 dark:bg-neutral-800"
          aria-hidden="true"
        />
      )}

      <CommentItem
        comment={node}
        isReply={depth > 0}
        onEdit={onEdit}
        onDelete={onDelete}
        onUpvote={onUpvote}
        onReply={() => onReply(node.parentId!, node._id)}
        scrollContainerRef={scrollContainerRef} // ✅ Pass ref
      />

      {/* Reply form */}
      <AnimatePresence>
        {replyTarget?.replyTo === node._id && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="mt-3 ml-4 md:ml-8"
          >
            <CommentForm
              parentId={replyTarget.parentId}
              replyTo={replyTarget.replyTo}
              onSubmitted={onSubmitReply}
              onCancel={onCancelReply}
              mode="reply"
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recursive replies */}
      {node.children && node.children.length > 0 && (
        <div className="mt-2 space-y-3">
          {node.children.map((child) => (
            <CommentNode
              key={child._id}
              node={child}
              depth={depth + 1}
              onEdit={onEdit}
              onDelete={onDelete}
              onUpvote={onUpvote}
              onReply={onReply}
              replyTarget={replyTarget}
              onCancelReply={onCancelReply}
              onSubmitReply={onSubmitReply}
              scrollContainerRef={scrollContainerRef}
            />
          ))}
        </div>
      )}
    </div>
  );
}
