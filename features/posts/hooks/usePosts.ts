"use client";

import { useEffect, useState, useCallback } from "react";

export interface Post {
  _id: string;
  title?: string;
  content?: string;
  createdAt?: string;
  authorId?: string | null;
  authorName: string;
  authorAvatar: string | null;
  upvoteCount: number;
  upvoters: string[];
  upvote: Int32Array
}

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const res = await fetch("/api/posts");
    const data = await res.json();
    setPosts(data);
    setLoading(false);
  }, []);

  // Create post
  const addPost = useCallback(
    async (title: string, content: string, authorId: string | null, authorName: string, authorAvatar: string | null) => {
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, authorId, authorName, authorAvatar }),
      });
    },
    []
  );

  const editPost = useCallback(async (id: string, title?: string, content?: string) => {
    await fetch("/api/posts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, title, content }),
    });
  }, []);

  const deletePost = useCallback(async (id: string) => {
    await fetch("/api/posts", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }, []);

  useEffect(() => {
    fetchData();

    const eventSource = new EventSource("/api/stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      setPosts((prev) => {
        switch (data.type) {
          case "new-post":
            // avoid duplicates if already added
            if (prev.some((p) => p._id === data.post._id)) return prev;
            return [data.post, ...prev];
          case "update-post":
            return prev.map((p) => (p._id === data.post._id ? { ...p, ...data.post } : p));
          case "delete-post":
            return prev.filter((p) => p._id !== data.id);
          default:
            return prev;
        }
      });
    };

    eventSource.onerror = (err) => {
      console.error("❌ SSE error:", err);
      // reconnect after a short delay
      eventSource.close();
      setTimeout(() => {
        window.location.reload(); // simple fallback if CF idle closes
      }, 3000);
    };

    return () => {
      eventSource.close();
    };
  }, [fetchData]);

  return { posts, loading, addPost, editPost, deletePost };
}
