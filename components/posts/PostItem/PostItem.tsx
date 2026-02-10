"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PostTypes, type Post } from "@/types/post";
import PostHeader from "./PostHeader";
import PostContent from "./PostContent";
import PostFooter from "./PostFooter";
import PostGraphModal from "./PostGraphModal";
import SharePostModal from "@/components/common/SharePostModal";
import PollView from "./PollView";

export type VotePollResult = {
  poll: Post["poll"];
  votedOptionIds: string[];
};

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
  onVote,
  isSingle = false,
  scrollContainerRef,
}: {
  post: Post;

  setPost?: React.Dispatch<React.SetStateAction<Post | null>>;

  onEdit?: () => Promise<void> | void;
  onDelete?: () => Promise<void> | void;

  onUpvote?: (id: string) => Promise<void>;
  onVote?: (postId: string, optionId: string) => Promise<VotePollResult | null>;

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

  const randomSpeed = useRef(2 + Math.random() * 2).current;
  const randomHue = useRef(Math.floor(Math.random() * 360)).current;

  return (
    <>
      <div ref={wrapperRef}>
        <div
          id={`post-${post._id}`}
          className={
            "relative bg-white dark:bg-neutral-900 border rounded-lg p-4 " +
            (post.isAdmin ? "admin-post-glow" : "")
          }
          style={
            post.isAdmin
              ? ({
                  "--speed": `${randomSpeed}s`,
                  "--glow-hue": randomHue,
                  "--glow-base": `hsl(${randomHue}, 100%, 65%)`,
                } as React.CSSProperties)
              : undefined
          }
        >
          <PostHeader
            post={post}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleGraph={() => setShowGraph((v) => !v)}
          />

          {/* 🔹 CATEGORIES */}
          <div className="flex flex-wrap gap-2 mb-2">
            {(() => {
              const categories =
                Array.isArray(post.categories) && post.categories.length > 0
                  ? post.categories
                  : post.parentPost?.categories;
              return categories?.map((cat) => {
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
              });
            })()}
          </div>

          {/* TITLE */}
          {post.title && post.postType !== PostTypes.ANSWER && (
            <h2
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                router.push(`/posts/${post._id}`, { scroll: false });
              }}
              className="font-semibold text-lg text-gray-800 dark:text-gray-100 hover:underline break-words w-fit"
            >
              {post.postType === PostTypes.QUESTION && (
                <span className="text-red-500">Q. </span>
              )}
              {post.title}
            </h2>
          )}

          {post.postType === PostTypes.ANSWER && (
            <>
              {post.parentPost?.title && (
                <h2
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/posts/${post.parentPost?._id}`, {
                      scroll: false,
                    });
                  }}
                  className="font-semibold text-lg text-gray-800 dark:text-gray-100 hover:underline break-words w-fit"
                >
                  <span className="text-red-500">Q. </span>
                  {post.parentPost.title}
                </h2>
              )}
              {post.title && (
                <h2
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    router.push(`/posts/${post._id}`, { scroll: false });
                  }}
                  className="font-semibold text-lg text-gray-800 dark:text-gray-100 hover:underline break-words w-fit"
                >
                  <span className="text-blue-500">A. </span>
                  {post.title}
                </h2>
              )}
            </>
          )}

          <PostContent
            post={post}
            scrollContainerRef={scrollContainerRef}
            wrapperRef={wrapperRef}
          />

          {/* 🗳️ POLL */}
          {post.postType === PostTypes.POLL && post.poll && onVote && (
            <PollView post={post} onVote={onVote} />
          )}

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
