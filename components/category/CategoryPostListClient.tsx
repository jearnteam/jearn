"use client";

import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";

interface Props {
  posts: Post[];
}

export default function CategoryPostListClient({ posts }: Props) {
  return (
    <PostList
      posts={posts}
      onEdit={() => {}}
      onDelete={async () => {}}
      onUpvote={async () => ({ ok: true })}
    />
  );
}
