"use client";

import { useRef, useState } from "react";
import { PostTypes, type Post } from "@/types/post";
import PostHeader from "./PostHeader";
import PostContent from "./PostContent";
import PostFooter from "./PostFooter";
import PostGraphModal from "./PostGraphModal";
import SharePostModal from "@/components/common/SharePostModal";
import Link from "next/link";
import { env } from "process";

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
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [postState, setPostState] = useState(post);
  const [shareOpen, setShareOpen] = useState(false);
  const [showGraph, setShowGraph] = useState(false);

  return (
    <>
      <div ref={wrapperRef} className="mb-3">
        <div
          id={`post-${postState._id}`}
          className="relative bg-white dark:bg-neutral-900 border rounded-xl p-4"
        >
          <PostHeader
            post={postState}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleGraph={() => setShowGraph((v) => !v)}
          />
          {/* TITLE */}
          <Link href={`/posts/${post._id}`} scroll={false}>
            {post.title && (
              <h2 className="font-semibold text-lg text-gray-800 dark:text-gray-100">
                {post.postType === PostTypes.QUESTION ? (
                  <span className="text-red-500">{"Q. "}</span>
                ) : (
                  ""
                )}
                {post.title}
              </h2>
            )}
          </Link>

          <PostContent
            post={postState}
            scrollContainerRef={scrollContainerRef}
            wrapperRef={wrapperRef}
          />

          {post.postType === PostTypes.QUESTION && (
            // TODO: 回答ボタン
            <></>
          )}

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
