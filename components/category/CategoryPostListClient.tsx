"use client";

import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";
import { useRef } from "react";

interface Props {
  posts: Post[];
}

export default function CategoryPostListClient({ posts }: Props) {
  const scrollRef = useRef<HTMLElement>(null!);
  return (
    <PostList
      posts={posts}
      onEdit={() => {}}
      onDelete={async () => {}}
      onUpvote={async () => ({ ok: true })}
    />
  );
}
