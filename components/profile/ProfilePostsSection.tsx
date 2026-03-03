import { RefObject, useState } from "react";
import type { Post } from "@/types/post";
import PostList from "@/components/posts/PostList";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import AnswerModal from "@/components/posts/AnswerModal";
import { useTranslation } from "react-i18next";

import { useEditPostModal } from "@/features/posts/hooks/useEditPostModal";
import { useDeletePostModal } from "@/features/posts/hooks/useDeletePostModal";
import { usePostInteractions } from "@/features/posts/hooks/usePostInteractions";
import { usePosts } from "@/features/posts/hooks/usePosts";

export default function ProfilePostsSection({
  posts,
  hasMore,
  onLoadMore,
  scrollRef,
}: {
  posts: Post[];
  hasMore: boolean;
  onLoadMore: () => void;
  scrollRef?: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation();

  const { editingPost, openEdit, closeEdit } = useEditPostModal();
  const { deleteId, requestDelete, closeDelete } = useDeletePostModal();

  const [answeringPost, setAnsweringPost] = useState<Post | null>(null);

  // 🔥 get from usePosts
  const { addAnswer, editPost, deletePost } = usePosts();

  const { upvote, vote, answer } = usePostInteractions({
    setAnsweringPost,
  });

  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">
        {t("profilePage.yourPosts")}
      </h2>

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
        scrollContainerRef={scrollRef}
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
    </section>
  );
}
