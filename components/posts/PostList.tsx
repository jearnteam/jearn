"use client";

import type { Post } from "@/types/post";
import PostItem from "./PostItem/PostItem";
import { motion } from "framer-motion";
import { useEffect, useRef, useMemo } from "react";
import type { UpvoteResponse } from "@/types/post";


interface Props {
  posts: Post[];
  hasMore: boolean;
  onLoadMore: () => void;
  onEdit: (post: Post) => void;
  onDelete: (id: string) => Promise<void>;
  onVote?: (postId: string, optionId: string) => void;
  // 🔥 CHANGE THIS
  onUpvote: (id: string) => Promise<void>;

  onAnswer: (post: Post) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export default function PostList({
  posts,
  hasMore,
  onLoadMore,
  onEdit,
  onDelete,
  onUpvote,
  onVote,
  onAnswer,
  scrollContainerRef,
}: Props) {
  // 🔧 FIX: stable reference for hooks
  const safePosts = useMemo(() => (Array.isArray(posts) ? posts : []), [posts]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const restoredOnce = useRef(false);

  /* ---------------- INFINITE SCROLL ---------------- */
  useEffect(() => {
    if (!hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      {
        root: scrollContainerRef?.current ?? null,
        rootMargin: "400px",
      }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore, scrollContainerRef]);

  /* ---------------- SCROLL RESTORE ---------------- */
  useEffect(() => {
    if (
      restoredOnce.current ||
      !scrollContainerRef?.current ||
      !sessionStorage.getItem("from-navigation")
    ) {
      return;
    }

    const id = sessionStorage.getItem("restore-post-id");
    if (!id) return;

    const el = document.getElementById(`post-${id}`);
    if (!el) return;

    restoredOnce.current = true;

    requestAnimationFrame(() => {
      el.scrollIntoView({ block: "start" });
    });

    sessionStorage.removeItem("restore-post-id");
    sessionStorage.removeItem("from-navigation");
  }, [safePosts, scrollContainerRef]);

  /* ---------------- RENDER ---------------- */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-[2px] overflow-hidden"
    >
      {safePosts.map((post) => (
        <PostItem
          key={post._id}
          post={post}
          onEdit={() => onEdit(post)}
          onDelete={() => onDelete(post._id)}
          onUpvote={(id) => onUpvote(id)}
          onVote={onVote}
          onAnswer={onAnswer}
          scrollContainerRef={scrollContainerRef}
        />
      ))}

      {hasMore && (
        <div
          ref={sentinelRef}
          className="h-10 flex items-center justify-center text-gray-500"
        >
          Loading…
        </div>
      )}
    </motion.div>
  );
}
