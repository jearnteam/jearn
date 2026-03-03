import { useState } from "react";
import type { Post } from "@/types/post";

export function useEditPostModal() {
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  function open(post: Post) {
    setEditingPost(post);
  }

  function close() {
    setEditingPost(null);
  }

  return {
    editingPost,
    openEdit: open,
    closeEdit: close,
  };
}
