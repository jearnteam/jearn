"use client";

import { useState } from "react";
import { PostTypes, type Post } from "@/types/post";
import PostHeader from "./PostHeader";
import PostContent from "./PostContent";
import PostFooter from "./PostFooter";
import SharePostModal from "@/components/common/SharePostModal";
import FullScreenPortal from "@/features/FullScreenPortal";
import GraphView from "@/components/graphview/GraphView";
import { CircleQuestionMark } from "lucide-react";

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
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [shareOpen, setShareOpen] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [graphKey, setGraphKey] = useState(0);

  return (
    <>
      <div id={`post-${post._id}`} className="mb-3">
        <div className="bg-white dark:bg-neutral-900 border rounded-xl p-4">
          {/* Question Icon */}
          {post.postType === PostTypes.QUESTION ? <CircleQuestionMark /> : ""}

          <PostHeader
            post={post}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleGraph={() => {
              setGraphKey(Date.now());
              setShowGraph(true);
            }}
          />

          <PostContent post={post} scrollContainerRef={scrollContainerRef} />

          <PostFooter
            post={post}
            isSingle={isSingle}
            onUpvote={onUpvote}
            onShare={() => setShareOpen(true)}
          />
        </div>
      </div>

      <SharePostModal
        open={shareOpen}
        postUrl={`${location.origin}/posts/${post._id}`}
        onCancel={() => setShareOpen(false)}
      />

      <FullScreenPortal>
        {showGraph && (
          <div className="fixed inset-0 bg-black/70 p-6">
            <GraphView key={graphKey} post={post} />
          </div>
        )}
      </FullScreenPortal>
    </>
  );
}
