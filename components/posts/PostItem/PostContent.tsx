import type { Post } from "@/types/post";
import React from "react";
import { motion } from "framer-motion";
import { MathRenderer } from "@/components/math/MathRenderer";
import { usePostCollapse } from "./usePostCollapse";

export default function PostContent({
  post,
  scrollContainerRef,
  wrapperRef,
}: {
  post: Post;
  scrollContainerRef: React.RefObject<HTMLDivElement | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}) {
  const {
    ref,
    expanded,
    setExpanded,
    collapsedHeight,
    shouldTruncate,
  } = usePostCollapse(post.content ?? "");

  return (
    <>
      <motion.div
        animate={{ height: expanded ? "auto" : collapsedHeight ?? "auto" }}
        className="overflow-hidden mt-2"
      >
        <div ref={ref}>
          <MathRenderer html={post.content ?? ""} />
        </div>
      </motion.div>

      {shouldTruncate && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-blue-600 text-sm"
        >
          {expanded ? "Show Less ▲" : "Show More ▼"}
        </button>
      )}
    </>
  );
}
