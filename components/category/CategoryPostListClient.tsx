"use client";

import { useState, RefObject } from "react";
import type { Post } from "@/types/post";
import PostList from "@/components/posts/PostList";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import AnswerModal from "@/components/posts/AnswerModal";

import { useEditPostModal } from "@/features/posts/hooks/useEditPostModal";
import { useDeletePostModal } from "@/features/posts/hooks/useDeletePostModal";
import { usePostInteractions } from "@/features/posts/hooks/usePostInteractions";
import { usePosts } from "@/features/posts/hooks/usePosts";

interface Props {
  posts: Post[];
  hasMore: boolean;
  onLoadMore: () => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export default function CategoryPostListClient({
  posts,
  hasMore,
  onLoadMore,
  scrollContainerRef,
}: Props) {
  const { editingPost, openEdit, closeEdit } = useEditPostModal();
  const { deleteId, requestDelete, closeDelete } = useDeletePostModal();

  const [answeringPost, setAnsweringPost] = useState<Post | null>(null);

  const { addAnswer, editPost, deletePost } = usePosts();

  const { upvote, vote, answer } = usePostInteractions({
    setAnsweringPost,
  });

  return (
    <>
      <PostList
        posts={posts}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        onUpvote={upvote}
        onVote={vote}
        onAnswer={answer}
        capabilities={{
          edit: openEdit,
          delete: requestDelete,
        }}
        scrollContainerRef={scrollContainerRef}
      />

      {/* EDIT */}
      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={closeEdit}
          onSave={async (
            title,
            content,
            categories,
            tags,
            poll,
            commentDisabled
          ) => {
            await editPost(
              editingPost._id,
              editingPost.content ?? "",
              title,
              content,
              categories,
              tags,
              editingPost.references,
              poll,
              commentDisabled
            );
            closeEdit();
          }}
        />
      )}

      {/* ANSWER */}
      {answeringPost && (
        <AnswerModal
          questionPost={answeringPost}
          onClose={() => setAnsweringPost(null)}
          onSubmit={addAnswer}
        />
      )}

      {/* DELETE */}
      <DeleteConfirmModal
        open={!!deleteId}
        onCancel={closeDelete}
        onConfirm={async () => {
          if (!deleteId) return;
          await deletePost(deleteId);
          closeDelete();
        }}
      />
    </>
  );
}