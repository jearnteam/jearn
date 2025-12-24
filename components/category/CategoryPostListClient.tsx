import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";
import type { RefObject } from "react";

interface Props {
  posts: Post[];
  hasMore: boolean;
  onLoadMore: () => void;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
}

export default function CategoryPostListClient({
  posts,
  hasMore,
  onLoadMore,
  scrollContainerRef,
}: Props) {
  return (
    <PostList
      posts={posts}
      hasMore={hasMore}
      onLoadMore={onLoadMore}
      onEdit={() => {}}
      onDelete={async () => {}}
      onUpvote={async () => ({ ok: true })}
      onAnswer={() => {}}
      scrollContainerRef={scrollContainerRef}
    />
  );
}
