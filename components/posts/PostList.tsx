"use client";

import type { Post } from "@/types/post";
import PostItem from "./PostItem";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

interface UpvoteResponse {
  ok: boolean;
  error?: string;
  action?: "added" | "removed";
}

interface Props {
  posts: Post[];
  onEdit: (post: Post) => void;
  onDelete: (id: string) => Promise<void>;
  onUpvote: (id: string, userId: string) => Promise<UpvoteResponse>;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>; // fixed type
}

export default function PostList({
  posts = [],
  onEdit,
  onDelete,
  onUpvote,
  scrollContainerRef,
}: Props) {
  const [visibleCount, setVisibleCount] = useState(5);
  const [visiblePosts, setVisiblePosts] = useState<Post[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("restore-visible-count");
    if (saved) {
      const n = Number(saved);
      if (!Number.isNaN(n) && n > 0) setVisibleCount(n);
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("postListVisibleCount", String(visibleCount));
  }, [visibleCount]);

  async function preloadImages(urls: string[]) {
    const tasks = urls.map(
      (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = resolve;
          img.onerror = resolve;
          img.src = url;
        })
    );
    await Promise.all(tasks);
  }

  useEffect(() => {
    if (!posts.length) return;

    const slice = posts.slice(0, visibleCount);
    const avatarURLs = slice.map((p) => `/api/user/avatar/${p.authorId}`);

    setBatchLoading(true);

    preloadImages(avatarURLs).then(() => {
      setVisiblePosts(slice);
      setBatchLoading(false);
    });
  }, [visibleCount, posts]);

  useEffect(() => {
    if (!posts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !batchLoading) {
          setVisibleCount((prev) => Math.min(prev + 5, posts.length));
        }
      },
      { root: null, rootMargin: "300px", threshold: 0.01 }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [posts.length, batchLoading]);

  const restoredOnce = useRef(false);

  useEffect(() => {
    if (restoredOnce.current) return;

    const id = sessionStorage.getItem("restore-post-id");
    if (!id) return;

    const el = document.getElementById(`post-${id}`);
    if (!el) return;

    restoredOnce.current = true;

    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "instant", block: "start" });
    });

    sessionStorage.removeItem("restore-post-id");
    sessionStorage.removeItem("restore-visible-count");
  }, [visiblePosts]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-3 overflow-hidden"
    >
      {visiblePosts.map((post) => (
        <PostItem
          key={post._id}
          post={post}
          onEdit={() => onEdit(post)}
          onDelete={onDelete}
          onUpvote={onUpvote}
          scrollContainerRef={scrollContainerRef}
        />
      ))}

      {batchLoading && (
        <div className="text-center py-4 text-gray-500">Loading…</div>
      )}

      <div ref={sentinelRef} className="h-10" />
    </motion.div>
  );
}
