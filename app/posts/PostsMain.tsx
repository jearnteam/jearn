"use client";

import { usePosts } from "@/features/posts/hooks/usePosts";
import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";

export default function PostsMain() {
  const {
    posts,
    loading,
    editPost,
    deletePost,
    upvotePost,
  } = usePosts();

  if (loading) {
    return (
      <div className="text-center py-6 text-gray-500 dark:text-gray-300">
        Loading...
      </div>
    );
  }

  return (
    <PostList
      posts={posts}
      onEdit={(post: Post) =>
        editPost(
          post._id,
          post.title ?? "", 
          post.content ?? "" 
        )
      }
      onDelete={deletePost}
      onUpvote={(id: string, userId: string) =>
        upvotePost(id, userId, crypto.randomUUID()).then(() => ({
          ok: true,
        }))
      }
    />
  );
}
