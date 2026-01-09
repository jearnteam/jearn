"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PostTypes, type Post } from "@/types/post";
import PostHeader from "./PostHeader";
import PostContent from "./PostContent";
import PostFooter from "./PostFooter";
import PostGraphModal from "./PostGraphModal";
import SharePostModal from "@/components/common/SharePostModal";
import Link from "next/link";

/**
 * @param isSingle 全画面表示か
 */
export default function PostItem({
  post,
  setPost,
  onEdit,
  onDelete,
  onUpvote,
  onAnswer,
  onShare,
  isSingle = false,
  scrollContainerRef,
}: {
  post: Post;

  setPost?: React.Dispatch<React.SetStateAction<Post | null>>;

  onEdit?: () => Promise<void> | void;
  onDelete?: () => Promise<void> | void;

  onUpvote?: (id: string) => Promise<void>;

  onAnswer?: (post: Post) => void;
  onShare?: () => void;

  isSingle?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // UI-only state (kept)
  const [shareOpen, setShareOpen] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  return (
    <>
      <div ref={wrapperRef}>
        <div
          id={`post-${post._id}`}
          className="relative bg-white dark:bg-neutral-900 border rounded-lg p-4"
        >
          <PostHeader
            post={post}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleGraph={() => setShowGraph((v) => !v)}
          />

          {/* 🔹 CATEGORIES */}
          {Array.isArray(post.categories) && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {post.categories.map((cat) => {
                const label = cat.name || cat.jname || cat.myname || "Category";

                return (
                  <span
                    key={cat.id}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/category/${cat.name}`, { scroll: false });
                    }}
                    className="
                      text-xs px-2 py-1 rounded-full
                      bg-blue-50 text-blue-700
                      dark:bg-blue-900/30 dark:text-blue-300
                      border border-blue-200 dark:border-blue-800
                      select-none cursor-pointer
                      hover:bg-blue-100 dark:hover:bg-blue-900/50
                    "
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          )}

          {/* TITLE */}
          {post.title && (
            <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100 break-words">
              {post.postType === PostTypes.QUESTION && (
                <span className="text-red-500">Q. </span>
              )}
              <Link
                href={`/posts/${post._id}`}
                scroll={false}
                className="hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {post.title}
              </Link>
            </h2>
          )}

          {!post.title && post.postType === PostTypes.ANSWER && (
            <h2
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/posts/${post._id}`, { scroll: false });
              }}
              className="font-semibold text-lg text-gray-800 dark:text-gray-100 hover:underline"
            >
              <span className="text-blue-500">A. </span>
            </h2>
          )}

          <PostContent
            post={post}
            scrollContainerRef={scrollContainerRef}
            wrapperRef={wrapperRef}
          />

          <PostFooter
            post={post}
            setPost={setPost}
            onUpvote={async (id) => {
              await onUpvote?.(id);
            }}
            isSingle={isSingle}
            onShare={() => {
              if (onShare) onShare(); // ✅ external hook
              setShareOpen(true); // ✅ internal modal
            }}
            onAnswer={() => onAnswer?.(post)}
          />
        </div>
      </div>

      <SharePostModal
        open={shareOpen}
        postUrl={`${process.env.NEXT_PUBLIC_APP_URL}/posts/${post._id}`}
        onCancel={() => setShareOpen(false)}
      />

      <PostGraphModal
        open={showGraph}
        post={post}
        onClose={() => setShowGraph(false)}
      />
    </>
  );
}
