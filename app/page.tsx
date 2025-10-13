"use client";

import { PostForm, PostList } from "@/components/posts";
import { usePosts } from "@/features/posts/hooks/usePosts";

export default function HomePage() {
  const { posts, addPost, editPost, deletePost } = usePosts();

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📄 Realtime Posts with KaTeX</h1>
      <PostForm onSubmit={addPost} />
      <PostList posts={posts} onEdit={editPost} onDelete={deletePost} />
    </div>
  );
}
