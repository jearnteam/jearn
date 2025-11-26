// components/posts/FullPostClient.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import type { Post } from "@/types/post";
import PostItem from "@/components/posts/PostItem";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";

interface Props {
  initialPost: Post;
}

export default function FullPostClient({ initialPost }: Props) {
  const [post, setPost] = useState<Post>(initialPost);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const router = useRouter();
  const { user } = useCurrentUser();

  /* ---------------------------------------------------------
   * SSE Listener — live sync post (including categories)
   * --------------------------------------------------------- */
  useEffect(() => {
    const es = new EventSource("/api/stream");

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // live upvote sync
      if (data.type === "upvote-post" && data.postId === post._id) {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                upvoteCount:
                  prev.upvoteCount + (data.action === "added" ? 1 : -1),
                upvoters:
                  data.action === "added"
                    ? [...prev.upvoters, data.userId]
                    : prev.upvoters.filter((u) => u !== data.userId),
              }
            : prev
        );
      }

      // live update sync (title, content, categories)
      if (data.type === "update-post" && data.post._id === post._id) {
        setPost((prev) => ({ ...prev, ...data.post }));
      }

      // deleted
      if (data.type === "delete-post" && data.id === post._id) {
        router.push("/");
      }
    };

    es.onerror = () => console.warn("⚠️ SSE error (FullPostClient)");
    return () => es.close();
  }, [post._id, router]);

  /* ---------------------------------------------------------
   * Upvote
   * --------------------------------------------------------- */
  const handleUpvote = useCallback(async () => {
    if (!user?.uid || !post._id) return;

    const res = await fetch(`/api/posts/${post._id}/upvote`, {
      method: "POST",
      body: JSON.stringify({ userId: user.uid }),
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) console.error("❌ Upvote error", await res.text());
  }, [post._id, user?.uid]);

  /* ---------------------------------------------------------
   * Edit
   * --------------------------------------------------------- */
  const handleEditClick = useCallback(() => {
    setEditOpen(true);
  }, []);

  const handleSavePost = useCallback(
    async (title: string, content: string, categories?: string[]) => {
      if (!post._id) return;

      const res = await fetch(`/api/posts`, {
        method: "PUT",
        body: JSON.stringify({
          id: post._id,
          title,
          content,
          categories,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("❌ Failed to save post");

      const { post: updated } = await res.json();
      setPost(updated as Post);
    },
    [post._id]
  );

  /* ---------------------------------------------------------
   * Delete
   * --------------------------------------------------------- */
  const handleDeleteClick = useCallback(() => {
    setDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!post._id) return;

    const res = await fetch(`/api/posts`, {
      method: "DELETE",
      body: JSON.stringify({ id: post._id }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) router.push("/");
  }, [post._id, router]);

  /* ---------------------------------------------------------
   * RENDER
   * --------------------------------------------------------- */
  return (
    <>
      {/* Full-size post view */}
      <PostItem
        post={post}
        fullView
        onUpvote={handleUpvote}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      {/* ✏️ Edit Modal */}
      {editOpen && (
        <EditPostModal
          post={post}
          onClose={() => setEditOpen(false)}
          onSave={handleSavePost}
        />
      )}

      {/* 🗑 Delete Confirm */}
      <DeleteConfirmModal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
