"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PostTypes, type Post } from "@/types/post";
import PostHeader from "./PostHeader";
import PostContent from "./PostContent";
import PostFooter from "./PostFooter";
import PostGraphModal from "./PostGraphModal";
import SharePostModal from "@/components/common/SharePostModal";

export default function PostItem({
  post,
  onEdit,
  onDelete,
  onUpvote,
  isSingle = false,
  scrollContainerRef,
}: {
  post: Post;
  onEdit?: (post: Post) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
  onUpvote?: (id: string, userId: string, txId?: string) => Promise<any>;
  isSingle?: boolean;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [postState, setPostState] = useState(post);
  const [shareOpen, setShareOpen] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  return (
    <>
      <div ref={wrapperRef}>
        <div
          id={`post-${postState._id}`}
          className="relative bg-white dark:bg-neutral-900 border rounded-lg p-4"
        >
          <PostHeader
            post={postState}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleGraph={() => setShowGraph((v) => !v)}
          />

          {/* TITLE (CRITICAL FIX) */}
          {post.title && (
            <h2
              onClick={(e) => {
                e.stopPropagation(); // 🔒 isolate click to title only

                router.push(`/posts/${post._id}`, {
                  scroll: false, // 🔑 prevent scroll reset
                });
              }}
              className="font-semibold text-lg text-gray-800 dark:text-gray-100 cursor-pointer hover:underline select-text"
            >
              {post.postType === PostTypes.QUESTION && (
                <span className="text-red-500">Q. </span>
              )}
              {post.postType === PostTypes.ANSWER && (
                <span className="text-blue-500">A. </span>
              )}
              {post.title}
            </h2>
          )}

          <PostContent
            post={postState}
            scrollContainerRef={scrollContainerRef}
            wrapperRef={wrapperRef}
          />

          <PostFooter
            post={postState}
            setPost={setPostState}
            onUpvote={onUpvote}
            isSingle={isSingle}
            onShare={() => setShareOpen(true)}
          />
        </div>
      </div>

      <SharePostModal
        open={shareOpen}
        postUrl={`${process.env.NEXT_PUBLIC_APP_URL}/posts/${postState._id}`}
        onCancel={() => setShareOpen(false)}
      />

      <PostGraphModal
        open={showGraph}
        post={postState}
        onClose={() => setShowGraph(false)}
      />
    </>
  );
}
