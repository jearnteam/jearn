"use client";

import type { Post } from "@/types/post";
import { motion } from "framer-motion";
import { MathRenderer } from "@/components/math/MathRenderer";
import { usePostCollapse } from "./usePostCollapse";

export default function PostContent({
  post,
  wrapperRef,
  scrollContainerRef,
}: {
  post: Post;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const {
    measureRef,
    expanded,
    setExpanded,
    collapsedHeight,
    fullHeight,
    initialized,
    shouldTruncate,
  } = usePostCollapse(post.content ?? "");

  const collapsed = collapsedHeight ?? fullHeight;
  const targetHeight = expanded ? fullHeight : collapsed;

  /* -------------------------------------------------
   * 🔧 Scroll correction BEFORE collapsing
   * ------------------------------------------------- */
  function jumpBeforeCollapseIfNeeded() {
    const wrapper = wrapperRef.current;
    const scroller = scrollContainerRef?.current;

    if (!wrapper || !scroller) return;

    const wrapperRect = wrapper.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();

    const topVisible =
      wrapperRect.top >= scrollerRect.top &&
      wrapperRect.top <= scrollerRect.bottom;

    if (topVisible) return;

    const delta = wrapperRect.top - scrollerRect.top;

    scroller.scrollTo({
      top: scroller.scrollTop + delta,
      behavior: "auto",
    });
  }

  return (
    <>
      {/* 🔒 Hidden measurement layer (always mounted) */}
      <div
        className="absolute invisible pointer-events-none"
        style={{ height: 0, overflow: "hidden" }}
      >
        <div ref={measureRef}>
          <MathRenderer html={post.content ?? ""} />
        </div>
      </div>

      {/* 🎬 Visible collapsing layer */}
      {initialized && (
        <>
          {shouldTruncate ? (
            /* 🎬 COLLAPSIBLE CONTENT */
            <>
              <motion.div
                initial={{ height: collapsed }}
                animate={{ height: targetHeight }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden mt-2"
              >
                <div className="pb-3">
                  <MathRenderer html={post.content ?? ""} />
                </div>
              </motion.div>

              <button
                onClick={() => {
                  if (expanded) {
                    setExpanded(false);
                    requestAnimationFrame(() => {
                      requestAnimationFrame(jumpBeforeCollapseIfNeeded);
                    });
                  } else {
                    setExpanded(true);
                  }
                }}
                className="mt-2 text-blue-600 text-sm"
              >
                {expanded ? "Show Less ▲" : "Show More ▼"}
              </button>
            </>
          ) : (
            /* ✅ NORMAL CONTENT — NO HEIGHT LOCK */
            <div className="mt-2">
              <MathRenderer html={post.content ?? ""} />
            </div>
          )}
        </>
      )}
    </>
  );
}
