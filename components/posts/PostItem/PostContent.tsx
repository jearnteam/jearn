"use client";

import type { Post } from "@/types/post";
import { motion } from "framer-motion";
import { MathRenderer } from "@/components/math/MathRenderer";
import { usePostCollapse } from "./usePostCollapse";
import { useEffect, useMemo, useState } from "react";
import { PostTypes } from "@/types/post";

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

/* -------------------------------------------------
 * 🧠 Detect meaningful rest content
 * ------------------------------------------------- */
function hasMeaningfulContent(html: string): boolean {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;

  if (tmp.querySelector("img, video")) return true;

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
          {shouldTruncate || firstMediaHTML ? (
            <>
              <motion.div
                initial={false}
                animate={{
                  maxHeight: expanded
                    ? fullHeight + SAFE_PADDING
                    : collapsed,
                }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative overflow-hidden mt-2"
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
                          requestAnimationFrame(
                            jumpBeforeCollapseIfNeeded
                          );
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
