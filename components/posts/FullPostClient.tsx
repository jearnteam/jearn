"use client";

import { useEffect, useState, useCallback } from "react";
import type { Post } from "@/types/post";
import PostItem from "@/components/posts/PostItem/PostItem";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";

interface Props {
  initialPost: Post;
}

export default function FullPostClient({ initialPost }: Props) {
  // 🔧 FIX: must allow null to match PostItem/PostFooter contract
  const [post, setPost] = useState<Post | null>(initialPost);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const router = useRouter();
  const { user } = useCurrentUser();

  /* ---------------------------------------------------------
   * SSE Listener — live sync post (title, content, categories, tags)
   * --------------------------------------------------------- */
  useEffect(() => {
    if (!post?._id) return;

    const es = new EventSource("/api/stream");

    es.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Upvote sync
      if (data.type === "upvote-post" && data.postId === post._id) {
        setPost((prev) =>
          prev
            ? {
                ...prev,
                upvoteCount:
                  (prev.upvoteCount ?? 0) + (data.action === "added" ? 1 : -1),
                upvoters:
                  data.action === "added"
                    ? [...(prev.upvoters ?? []), data.userId]
                    : (prev.upvoters ?? []).filter((u) => u !== data.userId),
              }
            : prev
        );
      }

      // Full post update sync
      if (data.type === "update-post" && data.post._id === post._id) {
        setPost((prev) => (prev ? { ...prev, ...data.post } : prev));
      }

      // When deleted
      if (data.type === "delete-post" && data.id === post._id) {
        router.push("/");
      }
    };

    es.onerror = () => console.warn("⚠️ SSE error (FullPostClient)");
    return () => es.close();
  }, [post?._id, router]);

  /* ---------------------------------------------------------
   * Upvote
   * --------------------------------------------------------- */
  const handleUpvote = useCallback(
    async (id: string, userId: string, _txId?: string) => {
      if (!userId || !id) return;

      const res = await fetch(`/api/posts/${id}/upvote`, {
        method: "POST",
        body: JSON.stringify({ userId }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) console.error("❌ Upvote error", await res.text());
    },
    []
  );

  /* ---------------------------------------------------------
   * Share
   * --------------------------------------------------------- */
  const handleShare = useCallback(() => {
    if (!post?._id) return;

    try {
      const url = `${window.location.origin}/posts/${post._id}`;
      navigator.clipboard?.writeText(url);
    } catch (e) {
      console.warn("Share failed", e);
    }
  }, [post?._id]);

  /* ---------------------------------------------------------
   * Answer
   * --------------------------------------------------------- */
  const handleAnswer = useCallback(() => {
    if (!post?._id) return;

    router.push(`/posts/${post._id}?focus=comments`, { scroll: false });
  }, [router, post?._id]);

  /* ---------------------------------------------------------
   * Edit
   * --------------------------------------------------------- */
  const handleEditClick = useCallback(() => {
    setEditOpen(true);
  }, []);

  const handleSavePost = useCallback(
    async (
      title: string,
      content: string,
      categories: string[],
      tags: string[]
    ) => {
      if (!post?._id) return;

      const res = await fetch(`/api/posts`, {
        method: "PUT",
        body: JSON.stringify({
          id: post._id,
          title,
          content,
          categories,
          tags,
        }),
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        console.error("❌ Failed to save post", await res.text());
        throw new Error("Failed to save post");
      }

      const { post: updated } = await res.json();
      setPost(updated as Post);
    },
    [post?._id]
  );

  /* ---------------------------------------------------------
   * Delete
   * --------------------------------------------------------- */
  const handleDeleteClick = useCallback(() => {
    setDeleteOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!post?._id) return;

    const res = await fetch(`/api/posts`, {
      method: "DELETE",
      body: JSON.stringify({ id: post._id }),
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) router.push("/");
  }, [post?._id, router]);

  /* ---------------------------------------------------------
   * Render
   * --------------------------------------------------------- */
  if (!post) return null;

  return (
    <>
      <PostItem
        post={post}
        setPost={setPost}          // ✅ now type-compatible
        isSingle={true}
        onUpvote={handleUpvote}
        onShare={handleShare}
        onAnswer={handleAnswer}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
      />

      {/* ✏️ Edit Modal */}
      {editOpen && (
        <EditPostModal
          post={post}
          onClose={() => setEditOpen(false)}
          onSave={(title, content, categories, tags) =>
            handleSavePost(title, content, categories, tags)
          }
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
