// components/posts/PostList.tsx
"use client";

import type { Post } from "@/types/post";
import PostItem from "./PostItem";
import { motion } from "framer-motion";

interface UpvoteResponse {
  ok: boolean;
  error?: string;
  action?: "added" | "removed";
}

interface Props {
  posts: Post[];
  onEdit: (post: Post) => void;
  onDelete: (id: string) => Promise<void>;
  onUpvote: (id: string, userId: string) => Promise<UpvoteResponse>;
}

export default function PostList({ posts = [], onEdit, onDelete, onUpvote }: Props) {
  return (
    <motion.ul
      initial={{ opacity: 0, filter: "blur(6px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="space-y-1"
    >
      {posts.map((post) => (
        <PostItem
          key={post._id}
          post={post}
          onEdit={() => onEdit(post)}
          onDelete={onDelete}
          onUpvote={onUpvote}
        />
      ))}
    </motion.ul>
  );
}
