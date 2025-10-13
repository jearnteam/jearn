"use client";

import {PostForm , PostList} from "@/components/posts";
import { usePosts } from "@/features/posts/hooks/usePosts";

export default function HomePage() {
  const { posts, loading, addPost, editPost, deletePost } = usePosts();
  return (
    <main className="p-6 max-w-xl mx-auto pt-16">
      <h1 className="text-2xl font-bold mb-4">📄 Realtime Posts with KaTeX</h1>
      <PostForm onSubmit={addPost} />
      <PostList posts={posts} onEdit={editPost} onDelete={deletePost} />
    </main>
  );
}