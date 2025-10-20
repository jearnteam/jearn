// features/posts/hooks/usePosts.ts
"use client";

import { useEffect, useState, useCallback } from "react";

export interface Post {
  _id: string;
  title?: string;
  content?: string;
  author?: string;
  createdAt?: string;
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

  // ✅ accept author as well
  const addPost = useCallback(
    async (title: string, content: string, author: string) => {
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, author }),
      });
      await fetchData();
    },
    [fetchData]
  );

  const editPost = useCallback(
    async (id: string, title?: string, content?: string) => {
      await fetch("/api/posts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title, content }),
      });
      await fetchData();
    },
    [fetchData]
  );

  const deletePost = useCallback(
    async (id: string) => {
      await fetch("/api/posts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      await fetchData();
    },
    [fetchData]
  );

  useEffect(() => {
    fetchData();
    const eventSource = new EventSource("/api/stream");

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPosts((prev) => {
        if (data.type === "new-post") return [...prev, data.post];
        if (data.type === "update-post")
          return prev.map((p) => (p._id === data.post._id ? data.post : p));
        if (data.type === "delete-post")
          return prev.filter((p) => p._id !== data.id);
        return prev;
      });
    };

    eventSource.onerror = (err) => console.error("❌ SSE error:", err);
    return () => eventSource.close();
  }, [fetchData]);

  return { posts, loading, addPost, editPost, deletePost };
}
