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
  if (!open) return null;

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

  return (
    <FullScreenPortal>
      <div
        className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <div
          className="relative max-w-5xl w-full h-[85vh] rounded-xl shadow-2xl overflow-hidden bg-[#0f0f0f]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-[50] w-12 h-12 flex items-center justify-center rounded-full bg-black/70 text-white text-2xl hover:bg-black/90 transition"
          >
            ×
          </button>

          {/* IMPORTANT: Remove overflow-auto */}
          <div className="w-full h-full">
            <GraphView post={graphPost} />
          </div>
        </div>
      </div>
    </FullScreenPortal>
  );
}
