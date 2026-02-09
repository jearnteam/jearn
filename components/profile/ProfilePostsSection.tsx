import { useState } from "react";
import type { Post } from "@/types/post";
import PostList from "@/components/posts/PostList";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";
import { useTranslation } from "react-i18next";

export default function ProfilePostsSection({
  posts,
  hasMore,
  onLoadMore,
}: {
  posts: Post[];
  hasMore: boolean;
  onLoadMore: () => void;
}) {
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {t} = useTranslation()
 
  return (
    <section>
      <h2 className="text-xl font-semibold mb-4">{t("profilePage.yourPosts")}</h2>

      <PostList
        posts={posts}
        hasMore={hasMore}
        onLoadMore={onLoadMore}
        onEdit={setEditingPost}
        onDelete={async (id) => {
          setDeleteId(id);
        }}
        onUpvote={async (_id) => {
          // optional: add upvote logic later
        }}
        onAnswer={async () => {}}
      />

      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={async () => {
            setEditingPost(null);
          }}
        />
      )}

      <DeleteConfirmModal
        open={!!deleteId}
        onCancel={() => setDeleteId(null)}
        onConfirm={async () => {
          setDeleteId(null);
        }}
      />
    </section>
  );
}
