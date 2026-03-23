"use client";

import type { Post } from "@/types/post";
import { useEffect, useMemo, useState } from "react";
import { MathRenderer } from "@/components/math/MathRenderer";
import { usePostCollapse, COLLAPSED_HEIGHT } from "./usePostCollapse";
import { PostTypes } from "@/types/post";
import { hasMeaningfulContent } from "@/lib/processText";
import { VirtuosoHandle } from "react-virtuoso";
import { extractContent } from "@/lib/post/extractedContent";

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
  const [translatedHTML, setTranslatedHTML] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);

  /* ================================
   * 🧠 Extract + Protect Code Blocks
   * ================================ */
  function extractWithPlaceholders(html: string) {
    const container = document.createElement("div");
    container.innerHTML = html;

    const codeMap: string[] = [];

    container.querySelectorAll("code").forEach((el, i) => {
      const key = `__C${i + 10}__`; // short + safe
      codeMap.push(el.outerHTML);

      el.replaceWith(document.createTextNode(` ${key} `)); // spacing IMPORTANT
    });

    return {
      text: container.innerHTML || "",
      codeMap,
    };
  }

  /* ================================
   * 🔁 Restore Code Blocks
   * ================================ */
  function restorePlaceholders(text: string, codeMap: string[]) {
    let result = text;

    codeMap.forEach((code, i) => {
      const key = `C${i + 10}`;
      result = result.replaceAll(key, code);
    });

    return result;
  }

  /* ================================
   * 🌐 Translate (single request)
   * ================================ */
  async function translateText(text: string) {
    if (!text.trim()) return text;

    const res = await fetch("/api/translate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        target: "en",
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.text) {
      console.error("Translate failed:", data);
      return text;
    }

    return data.text;
  }

  /* ================================
   * 🚀 MAIN TRANSLATION PIPELINE
   * ================================ */
  async function translateHTML(html: string) {
    // 1. Extract + protect code
    const { text, codeMap } = extractWithPlaceholders(html);

    // 2. Translate FULL sentence
    const translated = await translateText(text);

    // 3. Restore code blocks
    const restored = restorePlaceholders(translated, codeMap);

    return restored;
  }

  /* ================================
   * 🎯 USE IN COMPONENT
   * ================================ */
  async function translateContent() {
    if (translatedHTML) {
      setShowTranslated(!showTranslated);
      return;
    }

    try {
      setTranslating(true);

      const translated = await translateHTML(restHTML);

      setTranslatedHTML(translated);
      setShowTranslated(true);
    } catch (e) {
      console.error(e);
    } finally {
      setTranslating(false);
    }
  }

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

  const collapseWithSnap = () => {
    setExpanded(false);

    requestAnimationFrame(() => {
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
            <div className={expanded ? "pb-4" : ""}>
              {/* Original */}
              <MathRenderer html={restHTML} />

              {/* Translation */}
              {showTranslated && translatedHTML && (
                <div className="mt-2 border-l-2 pl-3 text-sm opacity-80 whitespace-pre-wrap">
                  {translatedHTML}
                </div>
              )}
            </div>
          ) : (
            /* 🔥 Feed Collapse Mode */
            <>
              <div
                ref={contentRef}
                onDoubleClick={handleContentDoubleClick}
                className={`relative overflow-hidden mt-2 transition-[max-height] duration-300 ease-in-out `}
                style={{
                  maxHeight: !needsCollapse
                    ? undefined
                    : expanded
                    ? undefined
                    : COLLAPSED_HEIGHT,
                  overflow: "hidden",
                }}
              >
                {/*
                <div className="mt-2 flex gap-2">
                
                  <button
                    onClick={translateContent}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    {translating
                      ? "Translating..."
                      : showTranslated
                      ? "Show Original"
                      : "Translate"}
                  </button>
                </div>
                  */}
                <div className={expanded ? "pb-4" : ""}>
                  <MathRenderer
                    html={
                      showTranslated && translatedHTML
                        ? translatedHTML
                        : restHTML
                    }
                  />
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
