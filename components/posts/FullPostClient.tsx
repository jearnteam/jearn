"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";

import type { Post, PostType } from "@/types/post";
import { PostTypes } from "@/types/post";

import PostItem from "@/components/posts/PostItem/PostItem";
import PostList from "@/components/posts/PostList";
import CommentClientSection from "@/components/comments/CommentClientSection";
import AnswerModal from "@/components/posts/AnswerModal";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";

import { usePosts } from "@/features/posts/hooks/usePosts";

interface Props {
  initialPost: Post;
  initialComments: Post[];
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function FullPostClient({
  initialPost,
  initialComments,
  scrollContainerRef,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useCurrentUser();

  // State
  const [post, setPost] = useState<Post | null>(initialPost);
  const [comments, setComments] = useState<Post[]>(initialComments);
  const [answers, setAnswers] = useState<Post[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [answerModalOpen, setAnswerModalOpen] = useState(false);

  // Hooks
  const { deletePost: hookDeletePost, addAnswer: hookAddAnswer } = usePosts();

  /* ---------------------------------------------------------
   * SSE Listener
   * --------------------------------------------------------- */
  useEffect(() => {
    if (!post?._id) return;

    const es = new EventSource("/api/stream");

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Update current post
        if (data.type === "update-post" && data.post._id === post._id) {
          setPost((prev) => (prev ? { ...prev, ...data.post } : prev));
        }
        // Update upvotes (optimistic sync)
        if (data.type === "upvote-post" && data.postId === post._id) {
          setPost((prev) => {
            if (!prev) return null;
            const isAdd = data.action === "added";
            return {
              ...prev,
              upvoteCount: (prev.upvoteCount ?? 0) + (isAdd ? 1 : -1),
              upvoters: isAdd
                ? [...(prev.upvoters ?? []), data.userId]
                : (prev.upvoters ?? []).filter((u) => u !== data.userId),
            };
          });
        }
        // Redirect on delete
        if (data.type === "delete-post" && data.id === post._id) {
          router.push("/");
        }
      } catch (e) {
        console.warn("SSE error", e);
      }
    };

    return () => es.close();
  }, [post?._id, router]);

  /* ---------------------------------------------------------
   * Fetch Answers (Only if Question)
   * --------------------------------------------------------- */
  const fetchAnswers = useCallback(async () => {
    if (post?.postType !== PostTypes.QUESTION) return;

    setLoadingAnswers(true);
    try {
      const res = await fetch(`/api/posts/${post._id}/answers`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setAnswers(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAnswers(false);
    }
  }, [post?._id, post?.postType]);

  useEffect(() => {
    if (post?.postType === PostTypes.QUESTION) {
      fetchAnswers();
    }
  }, [fetchAnswers, post?.postType]);

  /* ---------------------------------------------------------
   * Actions: Upvote
   * --------------------------------------------------------- */
  const handleUpvote = async (id: string, userId?: string) => {
    const targetUserId = userId || user?._id;
    if (!targetUserId) return;

    const res = await fetch(`/api/posts/${id}/upvote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: targetUserId }),
    });

    const data = await res.json();
    return { ok: res.ok, action: data.action };
  };

  /* ---------------------------------------------------------
   * Actions: Edit / Delete / Answer
   * --------------------------------------------------------- */
  const handleSavePost = async (
    title: string,
    content: string,
    categories: string[],
    tags: string[]
  ) => {
    if (!post) return;
    const res = await fetch(`/api/posts/${post._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, content, categories, tags }),
    });
    if (res.ok) {
      const { post: updated } = await res.json();
      setPost(updated);
      setEditOpen(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!post) return;
    await hookDeletePost(post._id);
    router.push("/");
  };

  const handleAnswerSubmit = async (
    postType: PostType,
    title: string, // AnswerModal passes title (even if empty)
    content: string,
    authorId: string | null,
    tags: string[],
    parentId: string
  ) => {
    await hookAddAnswer(postType, title, content, authorId, tags, parentId);
    setAnswerModalOpen(false);
    fetchAnswers(); // Reload answers
  };

  /* ---------------------------------------------------------
   * Render
   * --------------------------------------------------------- */
  if (!post) return null;

  return (
    <div className="max-w-3xl mx-auto pb-32">
      {/* 🔹 MAIN POST */}
      <PostItem
        post={post}
        setPost={setPost}
        isSingle={true}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onAnswer={() => setAnswerModalOpen(true)}
        // ✅ Fix: Wrap to return void
        onUpvote={async (id) => {
          await handleUpvote(id);
        }}
        onShare={() => {
          if (typeof navigator !== "undefined") {
            navigator.clipboard.writeText(
              `${window.location.origin}/posts/${post._id}`
            );
            alert("Link copied!");
          }
        }}
        scrollContainerRef={scrollContainerRef}
      />

      {/* 🔹 IF QUESTION: SHOW ANSWERS */}
      {post.postType === PostTypes.QUESTION && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">
              {answers.length} {t("answers")}
            </h3>
          </div>

          {loadingAnswers ? (
            <div className="p-8 text-center text-gray-500 animate-pulse">
              Loading answers...
            </div>
          ) : answers.length > 0 ? (
            <div className="space-y-4">
              <PostList
                posts={answers}
                // ✅ Add missing scroll props (answers API fetches all at once for now)
                hasMore={false}
                onLoadMore={() => {}}
                
                // TODO: Implement Answer Edit
                onEdit={() => {}} 
                
                onDelete={async (id) => {
                  await hookDeletePost(id);
                  setAnswers((prev) => prev.filter((a) => a._id !== id));
                }}
                
                // ✅ Fix: Wrap to return void (PostList expects Promise<void>)
                onUpvote={async (id) => {
                  await handleUpvote(id);
                }}
                
                // No nesting answers for now
                onAnswer={() => {}}
                
                scrollContainerRef={scrollContainerRef}
              />
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500 bg-gray-50 dark:bg-neutral-900 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
              {t("noAnswersYet")}
            </div>
          )}
        </div>
      )}

      {/* 🔹 IF NOT QUESTION: SHOW COMMENTS */}
      {post.postType !== PostTypes.QUESTION && (
        <div className="mt-6">
          <CommentClientSection
            comments={comments}
            postId={post._id}
            scrollContainerRef={scrollContainerRef}
          />
        </div>
      )}

      {/* 🔹 MODALS */}
      {answerModalOpen && (
        <AnswerModal
          questionPost={post}
          onClose={() => setAnswerModalOpen(false)}
          onSubmit={handleAnswerSubmit}
        />
      )}

      {editOpen && (
        <EditPostModal
          post={post}
          onClose={() => setEditOpen(false)}
          onSave={handleSavePost}
        />
      )}

      <DeleteConfirmModal
        open={deleteOpen}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}