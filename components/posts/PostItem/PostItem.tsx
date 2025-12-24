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

export default function PostItem({
  post,
  setPost, // ✅ ADDED
  onEdit,
  onDelete,
  onUpvote,
  onAnswer,
  isSingle = false,
  scrollContainerRef,
}: {
  post: Post;
  setPost?: React.Dispatch<React.SetStateAction<Post>>; // ✅ ADDED
  onEdit?: (post: Post) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onUpvote?: (id: string, userId: string, txId?: string) => Promise<any>;
  onAnswer?: (post: Post) => void;
  isSingle?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // UI-only state (this is OK ✅)
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
            <h2
              className="
                font-semibold text-lg
                text-gray-800 dark:text-gray-100
                select-text
                whitespace-normal
                break-words
              "
            >
              {post.postType === PostTypes.QUESTION && (
                <span className="text-red-500">Q. </span>
              )}

              <Link
                href={`/posts/${post._id}`}
                scroll={false}
                className="
                  inline
                  cursor-pointer
                  hover:underline
                  break-words
                "
                onClick={(e) => {
                  e.stopPropagation();
                }}
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
              className="
                block                     /* ✅ allow wrapping */
                cursor-pointer
                font-semibold text-lg
                text-gray-800 dark:text-gray-100
                hover:underline
                select-text

                break-words                /* ✅ normal word wrap */
                break-all                  /* ✅ fallback for long strings */
                whitespace-normal          /* ✅ multi-line */
              "
            >
              <span className="text-blue-500">A. </span>
              {/* {post.parentId} */}
            </h2>
          )}

          <PostContent
            post={post}
            scrollContainerRef={scrollContainerRef}
            wrapperRef={wrapperRef}
          />

          <PostFooter
            post={post}
            setPost={setPost} // ✅ PASS DOWN
            onUpvote={onUpvote}
            isSingle={isSingle}
            onShare={() => setShareOpen(true)}
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
