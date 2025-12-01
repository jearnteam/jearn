"use client";

import { usePosts } from "@/features/posts/hooks/usePosts";
import PostList from "@/components/posts/PostList";
import type { Post } from "@/types/post";
import { t } from "i18next";
import FullScreenLoader from "@/components/common/FullScreenLoader";

export default function PostsMain() {
  const { posts, loading, editPost, deletePost, upvotePost } = usePosts();

  if (loading) {
    return <FullScreenLoader text={t("loadingUser")} />;
  }

  return (
    <PostList
      posts={posts}
      onEdit={(post: Post) =>
        editPost(post._id, post.title ?? "", post.content ?? "")
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
