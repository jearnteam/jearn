"use client";

import type { Post } from "@/types/post";
import { motion } from "framer-motion";
import { MathRenderer } from "@/components/math/MathRenderer";
import { usePostCollapse } from "./usePostCollapse";
import { useEffect, useMemo, useRef, useState } from "react";
import { PostTypes } from "@/types/post";
import { hasMeaningfulContent } from "@/lib/processText";

/* -------------------------------------------------
 * 🧠 Extract ONLY the first img / video
 * ------------------------------------------------- */
function splitFirstMedia(html: string): {
  firstMediaHTML: string | null;
  restHTML: string;
} {
  const container = document.createElement("div");
  container.innerHTML = html.trim();

  // Find first meaningful element (skip empty text nodes)
  let firstElement: HTMLElement | null = null;

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
      continue; // skip empty text
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      firstElement = node as HTMLElement;
    }
    break;
  }

  if (!firstElement) {
    return { firstMediaHTML: null, restHTML: html };
  }

  const isMedia = (el: HTMLElement) =>
    ["IMG", "VIDEO", "PICTURE"].includes(el.tagName);

  // Case 1: First element is media directly
  if (isMedia(firstElement)) {
    const firstMediaHTML = firstElement.outerHTML;
    firstElement.remove();

    return {
      firstMediaHTML,
      restHTML: container.innerHTML,
    };
  }

  // Case 2: Wrapped inside <p> and contains only media
  if (firstElement.tagName === "P" && firstElement.children.length === 1) {
    const child = firstElement.firstElementChild as HTMLElement | null;

    if (child && isMedia(child)) {
      const firstMediaHTML = child.outerHTML;
      firstElement.remove();

      return {
        firstMediaHTML,
        restHTML: container.innerHTML,
      };
    }
  }

  return { firstMediaHTML: null, restHTML: html };
}

/* -------------------------------------------------
 * 🎥 Extract first frame from video
 * ------------------------------------------------- */
async function extractVideoPoster(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.src = url;
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    video.addEventListener("loadeddata", () => {
      video.currentTime = 0.1;
    });

    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) return reject();

      ctx.drawImage(video, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    });

    video.onerror = reject;
  });
}

export default function PostContent({
  post,
  wrapperRef,
  scrollContainerRef,
  disableCollapse = false, // for graphview node post popup
}: {
  post: Post;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  disableCollapse?: boolean; // for graphview node post popup
}) {
  /* =========================================================
   * 🎥 VIDEO THUMBNAIL (FIRST FRAME)
   * ========================================================= */
  const [poster, setPoster] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (post.postType !== PostTypes.VIDEO) return;
    if (!post.video?.url) return;

    let cancelled = false;

    extractVideoPoster(post.video.url)
      .then((img) => {
        if (!cancelled) setPoster(img);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [post.postType, post.video?.url]);

  /* =========================================================
   * 📝 NON-VIDEO POSTS
   * ========================================================= */
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

  const lastTapRef = useRef(0);

  function handleContentClick(e: React.MouseEvent) {
    if (!expanded) return;
    if (disableCollapse) return;

    const now = Date.now();
    const DOUBLE_CLICK_DELAY = 280;

    const target = e.target as HTMLElement;

    // 🚫 Ignore interactive elements
    if (
      target.closest("a, button, video, input, textarea") ||
      target.closest(".katex") ||
      target.closest("[data-no-collapse]")
    ) {
      return;
    }

    if (now - lastTapRef.current < DOUBLE_CLICK_DELAY) {
      // 💥 Clear selection (prevents highlight stuck)
      const selection = window.getSelection();
      if (selection) selection.removeAllRanges();

      setExpanded(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(jumpBeforeCollapseIfNeeded);
      });
    }

    lastTapRef.current = now;
  }

  /* =========================================================
   * 🎥 VIDEO POST → VIDEO ONLY
   * ========================================================= */
  if (post.postType === PostTypes.VIDEO && post.video?.url) {
    return (
      <div className="mt-2">
        <div
          className="
              relative w-full overflow-hidden rounded-xl bg-black
              aspect-video max-h-[480px]
            "
        >
          <video
            src={post.video.url}
            poster={poster}
            controls
            preload="metadata"
            playsInline
            className="
                absolute inset-0
                w-full h-full
                object-contain
              "
          />
        </div>
      </div>
    );
  }

  const collapsed = firstMediaHTML ? 0 : collapsedHeight ?? fullHeight;

  /** 🔒 Mobile safety buffer (prevents last-line clipping) */
  const SAFE_PADDING = 32;

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
      {/* 🖼️ FIRST MEDIA */}
      {firstMediaHTML && (
        <div className="mt-2">
          <MathRenderer html={firstMediaHTML} />
        </div>
      )}

      {/* 🔒 Measurement layer */}
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

      {/* 🎬 COLLAPSIBLE CONTENT */}
      {initialized && hasRestContent && (
        <>
          {disableCollapse ? (
            // ✅ FULL CONTENT (NO COLLAPSE)
            <div className="mt-2">
              <MathRenderer html={restHTML} />
            </div>
          ) : shouldTruncate || firstMediaHTML ? (
            <>
              <motion.div
                onClick={handleContentClick}
                initial={false}
                animate={{
                  maxHeight: expanded ? fullHeight + SAFE_PADDING : collapsed,
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative overflow-hidden mt-2 cursor-pointer"
              >
                <div className="pb-8">
                  <MathRenderer html={restHTML} />
                </div>
              </motion.div>

              {shouldTruncate && (
                <div className="mt-2 text-left">
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
                    className="px-2 py-1 text-blue-600 text-sm hover:underline"
                  >
                    {expanded ? "Show Less ▲" : "Show More ▼"}
                  </button>
                </div>
              )}
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
