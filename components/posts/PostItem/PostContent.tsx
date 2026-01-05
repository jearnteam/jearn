"use client";

import type { Post } from "@/types/post";
import { motion } from "framer-motion";
import { MathRenderer } from "@/components/math/MathRenderer";
import { usePostCollapse } from "./usePostCollapse";
import { useMemo } from "react";

/* -------------------------------------------------
 * 🧠 Extract ONLY the first img / video
 * ------------------------------------------------- */
function splitFirstMedia(html: string): {
  firstMediaHTML: string | null;
  restHTML: string;
} {
  const container = document.createElement("div");
  container.innerHTML = html;

  const media = container.querySelector("img, video") as HTMLElement | null;

  if (!media) {
    return { firstMediaHTML: null, restHTML: html };
  }

  const firstMediaHTML = media.outerHTML;
  media.remove();

  return {
    firstMediaHTML,
    restHTML: container.innerHTML,
  };
}

/* -------------------------------------------------
 * 🧠 Detect meaningful rest content (text OR media)
 * ------------------------------------------------- */
function hasMeaningfulContent(html: string): boolean {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  // Remaining media
  if (tmp.querySelector("img, video")) return true;

  // Remaining text
  const text = tmp.textContent?.replace(/\s+/g, "").trim() ?? "";
  return text.length > 0;
}

export default function PostContent({
  post,
  wrapperRef,
  scrollContainerRef,
}: {
  post: Post;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const { firstMediaHTML, restHTML } = useMemo(
    () => splitFirstMedia(post.content ?? ""),
    [post.content]
  );

  const hasRestContent = useMemo(
    () => hasMeaningfulContent(restHTML),
    [restHTML]
  );

  const {
    measureRef,
    expanded,
    setExpanded,
    collapsedHeight,
    fullHeight,
    initialized,
    shouldTruncate,
  } = usePostCollapse(restHTML);

  // 🔑 Collapse logic
  const collapsed = firstMediaHTML
    ? 0 // media-first posts hide everything below image
    : collapsedHeight ?? fullHeight;

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
      {/* 🖼️ FIRST MEDIA (ALWAYS VISIBLE) */}
      {firstMediaHTML && (
        <div className="mt-2">
          <MathRenderer html={firstMediaHTML} />
        </div>
      )}

      {/* 🔒 Hidden measurement layer (REST ONLY) */}
      {hasRestContent && (
        <div
          className="absolute invisible pointer-events-none"
          style={{ height: 0, overflow: "hidden" }}
        >
          <div ref={measureRef}>
            <MathRenderer html={restHTML} />
          </div>
        </div>
      )}

      {/* 🎬 COLLAPSIBLE CONTENT (BELOW FIRST MEDIA) */}
      {initialized && hasRestContent && (
        <>
          {(shouldTruncate || firstMediaHTML) ? (
            <>
              <motion.div
                initial={{ height: collapsed }}
                animate={{ height: targetHeight }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="overflow-hidden mt-2"
              >
                <div className="pb-3">
                  <MathRenderer html={restHTML} />
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
            <div className="mt-2">
              <MathRenderer html={restHTML} />
            </div>
          )}
        </>
      )}
    </>
  );
}
