"use client";

import { useEffect, useState } from "react";
import type { Post } from "@/types/post";
import { useSSE } from "@/features/sse/SSEProvider";

export function useSearchSSEPosts(initialPosts: Post[]) {
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const { lastMessage } = useSSE();

  // Sync when new results come from wrapper
  useEffect(() => {
    setPosts((prev) => {
      // Prevent unnecessary state updates
      if (
        prev.length === initialPosts.length &&
        prev.every((p, i) => p._id === initialPosts[i]?._id)
      ) {
        return prev;
      }
      return initialPosts;
    });
  }, [initialPosts]);

  // Patch with SSE
  useEffect(() => {
    if (!lastMessage) return;

    setPosts((prev) => {
      switch (lastMessage.type) {
        case "update-post":
        case "update-comment":
        case "update-reply":
          return prev.map((p) =>
            String(p._id) === String(lastMessage.postId)
              ? { ...p, ...lastMessage.post }
              : p
          );

        case "delete-post":
          return prev.filter(
            (p) => String(p._id) !== String(lastMessage.postId)
          );

        case "new-post":
          // Optional: insert if matches search
          return prev;

        default:
          return prev;
      }
    });
  }, [lastMessage]);

  return posts;
}
