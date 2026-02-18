"use client";

import type { Post } from "@/types/post";
import { useEffect, useMemo, useState } from "react";
import { MathRenderer } from "@/components/math/MathRenderer";
import { usePostCollapse, COLLAPSED_HEIGHT } from "./usePostCollapse";
import { PostTypes } from "@/types/post";
import { hasMeaningfulContent } from "@/lib/processText";
import { VirtuosoHandle } from "react-virtuoso";

/* -------------------------------------------------
 * 🧠 Extract ONLY the first img / video
 * ------------------------------------------------- */
function splitFirstMedia(html: string): {
  firstMediaHTML: string | null;
  restHTML: string;
} {
  const container = document.createElement("div");
  container.innerHTML = html.trim();

  let firstElement: HTMLElement | null = null;

  for (const node of Array.from(container.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
      continue;
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

  if (isMedia(firstElement)) {
    const firstMediaHTML = firstElement.outerHTML;
    firstElement.remove();
    return {
      firstMediaHTML,
      restHTML: container.innerHTML,
    };
  }

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
 * 🎥 Extract first frame for video
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
  disableCollapse = false,
  index,
  virtuosoRef,
  wrapperRef,
}: {
  post: Post;
  disableCollapse?: boolean;
  index: number;
  virtuosoRef: React.RefObject<VirtuosoHandle | null>;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [poster, setPoster] = useState<string | undefined>(undefined);

  /* ---------------- VIDEO HANDLING ---------------- */
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

  /* ---------------- SPLIT MEDIA ---------------- */
  const { firstMediaHTML, restHTML } = useMemo(
    () => splitFirstMedia(post.content ?? ""),
    [post.content]
  );

  const hasRestContent = useMemo(
    () => hasMeaningfulContent(restHTML),
    [restHTML]
  );

  /* ---------------- COLLAPSE LOGIC ---------------- */
  const { contentRef, expanded, setExpanded, needsCollapse } =
    usePostCollapse();

  const isCollapsed = !disableCollapse && !expanded;
  const collapseWithSnap = () => {
    setExpanded(false);

    requestAnimationFrame(() => {
      const el = wrapperRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();

      if (rect.top >= 0) return;

      virtuosoRef.current?.scrollToIndex({
        index,
        align: "start",
        behavior: "auto",
      });
    });
  };

  const handleToggleExpand = () => {
    if (expanded) {
      collapseWithSnap();
    } else {
      setExpanded(true);
    }
  };
  const handleContentDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!expanded) return;

    const target = e.target as HTMLElement;

    // Ignore interactive elements
    if (
      target.closest("a, button, input, textarea, video, img, [role='button']")
    ) {
      return;
    }

    collapseWithSnap();
  };

  /* ---------------- VIDEO POST ---------------- */
  if (post.postType === PostTypes.VIDEO && post.video?.url) {
    return (
      <div className="mt-2">
        <div className="relative w-full overflow-hidden rounded-xl bg-black aspect-video max-h-[480px]">
          <video
            src={post.video.url}
            poster={poster}
            controls
            preload="metadata"
            playsInline
            className="absolute inset-0 w-full h-full object-contain"
          />
        </div>
      </div>
    );
  }

  /* ---------------- NORMAL POST ---------------- */
  return (
    <>
      {/* First Media */}
      {firstMediaHTML && (
        <div className="mt-2">
          <MathRenderer html={firstMediaHTML} />
        </div>
      )}

      {/* Rest Content */}
      {hasRestContent && (
        <>
          {disableCollapse ? (
            /* 🔥 Full Display Mode (Modal) */
            <div className="mt-2">
              <MathRenderer html={restHTML} openLinksInNewTab />
            </div>
          ) : (
            /* 🔥 Feed Collapse Mode */
            <>
              <div
                ref={contentRef}
                onDoubleClick={handleContentDoubleClick}
                className={`relative overflow-hidden mt-2 transition-[max-height] duration-300 ease-in-out ${
                  expanded ? "cursor-zoom-out" : ""
                }`}
                style={{
                  maxHeight: !needsCollapse
                    ? undefined
                    : expanded
                    ? undefined
                    : COLLAPSED_HEIGHT,
                  overflow: "hidden",
                }}
              >
                <div className={expanded ? "pb-4" : ""}>
                  <MathRenderer html={restHTML} />
                </div>

                {!expanded && needsCollapse && (
                  <div
                    className="
                      absolute bottom-0 left-0 w-full h-24
                      bg-gradient-to-t from-white via-white/80 to-transparent
                      dark:from-black dark:via-black/80
                      pointer-events-none
                    "
                  />
                )}
              </div>
              {needsCollapse && (
                <div className="mt-1 text-left">
                  <button
                    onClick={handleToggleExpand}
                    className="px-1 py-1 text-blue-600 dark:text-blue-400 text-sm hover:underline font-medium"
                  >
                    {expanded ? "Show Less ▲" : "Show More ▼"}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
