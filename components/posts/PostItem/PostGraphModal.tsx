"use client";

import { useMemo } from "react";
import FullScreenPortal from "@/features/FullScreenPortal";
import GraphView from "@/components/graph/GraphView";
import type { Post } from "@/types/post";
import { PostTypes } from "@/types/post";

export default function PostGraphModal({
  open,
  post,
  onClose,
}: {
  open: boolean;
  post: Post;
  onClose: () => void;
}) {
  /**
   * 🔧 Normalize Post → GraphPost
   * Memoized to prevent unnecessary rebuilds.
   */
  const graphPost = useMemo(() => {
    return {
      _id: post._id,

      title:
        post.title ??
        (post.postType === PostTypes.ANSWER ? "Answer" : "Untitled Post"),

      // ✅ FIX: guarantee string
      authorId: post.authorId ?? "unknown",

      authorName: post.authorName ?? "Unknown",

      tags: post.tags ?? [],

      categories: (post.categories ?? []).map((c) => ({
        name: c.name || c.jname || c.myname || "Category",
      })),
    };
  }, [post]);

  if (!open) return null;

  return (
    <FullScreenPortal>
      <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center md:p-6">
        <div
          className="
            relative
            w-full h-full
            md:max-w-5xl md:h-[85vh]
            bg-background dark:bg-[#0f0f0f]
            md:rounded-xl
            shadow-2xl
            overflow-hidden
          "
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="
              absolute top-4 right-4 z-[50]
              w-10 h-10
              flex items-center justify-center
              rounded-full
              text-black dark:text-white text-xl
              transition
            "
          >
            ×
          </button>

          <div className="w-full h-full">
            <GraphView post={graphPost} />
          </div>
        </div>
      </div>
    </FullScreenPortal>
  );
}
