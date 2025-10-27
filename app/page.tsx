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
    <div className="h-screen w-full flex">
      {/* Left Sidebar */}
      <div className="pt-15 hidden lg:block w-[20%] bg-black overflow-y-auto p-4">
        <div className="space-y-4 text-white">
          <p>Left Content</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-15 w-full lg:w-[60%] overflow-y-auto scrollbar-hide">
        <PostForm onSubmit={addPost} />
        <PostList
          posts={posts}
          onEdit={editPost}
          onDelete={deletePost}
          onUpvote={upvotePost}
        />
      </div>

      {/* Right Sidebar */}
      <div className="pt-15 hidden lg:block w-[20%] bg-black overflow-y-auto p-4">
        <div className="space-y-4 text-white">
          <p>Right Content</p>
        </div>
      </div>
    </div>
  );
}
