"use client";

import { PostForm, PostList } from "@/components/posts";
import { usePosts } from "@/features/posts/hooks/usePosts";

export default function HomePage() {
  const { posts, addPost, editPost, deletePost } = usePosts();

  async function upvotePost(
    id: string,
    userId: string
  ): Promise<{ ok: boolean; error?: string; action?: "added" | "removed" }> {
    try {
      const res = await fetch(`/api/posts/${id}/upvote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { ok: false, error: data.error || "Failed to upvote" };
      }

      return { ok: true, action: data.action };
    } catch (err) {
      console.error("❌ Upvote error:", err);
      return { ok: false, error: "Network error" };
    }
  }

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📄 Realtime Posts with KaTeX</h1>
      <PostForm onSubmit={addPost} />
      <PostList
        posts={posts}
        onEdit={editPost}
        onDelete={deletePost}
        onUpvote={upvotePost}
      />
    </div>
  );
}
