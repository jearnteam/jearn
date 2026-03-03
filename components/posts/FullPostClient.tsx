"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";

import type { Poll, Post, PostType } from "@/types/post";
import { PostTypes } from "@/types/post";
import { usePostInteractions } from "@/features/posts/hooks/usePostInteractions";

import PostItem from "@/components/posts/PostItem/PostItem";
import PostList from "@/components/posts/PostList";
import CommentClientSection from "@/components/comments/CommentClientSection";
import AnswerModal from "@/components/posts/AnswerModal";
import EditPostModal from "@/components/posts/EditPostModal";
import DeleteConfirmModal from "@/components/common/DeleteConfirmModal";

import { usePosts } from "@/features/posts/hooks/usePosts";
import { VirtuosoHandle } from "react-virtuoso";

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

  const { upvote, vote, answer } = usePostInteractions({
    setAnsweringPost: (post) => setAnswerModalOpen(true),
  });

  // Modals
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [answerModalOpen, setAnswerModalOpen] = useState(false);

  // Hooks
  const {
    deletePost: hookDeletePost,
    addAnswer: hookAddAnswer,
    editPost,
  } = usePosts();

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
   * Actions: Edit / Delete / Answer
   * --------------------------------------------------------- */
  const handleSavePost = async (
    title: string,
    content: string,
    categories: string[],
    tags: string[],
    poll?: Poll
  ) => {
  
    if (!post) return;

    await editPost(
      post._id,
      post.content ?? "",
      title,
      content,
      categories,
      tags,
      post.references,
      poll,
      post.commentDisabled
    );

    // optimistic local update instead of refetch
    setPost((prev) =>
      prev
        ? {
            ...prev,
            title,
            content,
            tags,
          }
        : prev
    );

    setEditOpen(false);
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
    parentId: string,
    tags: string[],
    references: string[]
  ) => {
    await hookAddAnswer(postType, title, content, authorId, parentId, tags);
    setAnswerModalOpen(false);
    fetchAnswers(); // Reload answers
  };

  /* TODO: 以下のvirtuosoに必要な項目を正しく追加する */
  const null_virtuoso = useRef<VirtuosoHandle | null>(null);

  /* ---------------------------------------------------------
   * Render
   * --------------------------------------------------------- */
  if (!post) return null;

  return (
    <div
      className={`
    max-w-3xl mx-auto pb-32
    ${!scrollContainerRef ? "pt-[2.6rem]" : ""}
    `}
    >
      {/* 🔹 MAIN POST */}
      <PostItem
        post={post}
        setPost={setPost}
        isSingle={true}
        onEdit={() => setEditOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onAnswer={() => setAnswerModalOpen(true)}
        onUpvote={upvote}
        onVote={vote}
        scrollContainerRef={scrollContainerRef}
        index={0}
        virtuosoRef={null_virtuoso}
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
                hasMore={false}
                onLoadMore={() => {}}
                onUpvote={upvote}
                onVote={vote} // ✅ real poll vote
                onAnswer={answer} // ✅ real answer handler
                capabilities={{
                  edit: (post) => setEditOpen(true),
                  delete: async (id: string) => {
                    await hookDeletePost(id);
                    setAnswers((prev) => prev.filter((a) => a._id !== id));
                  },
                }}
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
            post={post}
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
