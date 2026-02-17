"use client";

import type { Post } from "@/types/post";
import { motion } from "framer-motion";
import { MathRenderer } from "@/components/math/MathRenderer";
import { usePostCollapse, COLLAPSED_HEIGHT } from "./usePostCollapse";
import { useEffect, useMemo, useState, useRef } from "react";
import { PostTypes } from "@/types/post";
import { hasMeaningfulContent } from "@/lib/processText";

/* -------------------------------------------------
 * 🧠 Extract ONLY the first img / video (変更なし)
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
 * 🎥 Extract first frame (変更なし)
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
  disableCollapse = false,
}: {
  post: Post;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  disableCollapse?: boolean;
}) {
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

  const { firstMediaHTML, restHTML } = useMemo(
    () => splitFirstMedia(post.content ?? ""),
    [post.content]
  );

  const hasRestContent = useMemo(
    () => hasMeaningfulContent(restHTML),
    [restHTML]
  );

  const { contentRef, isTruncated, expanded, setExpanded, isMeasurementDone } =
    usePostCollapse();

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (expanded) {
      // 🔽 Show Less (閉じる)
      // まず状態を更新して、レンダリング上の高さを縮める
      setExpanded(false);

      // DOM更新完了後(requestAnimationFrame)にスクロール位置を調整する
      requestAnimationFrame(() => {
        const wrapper = wrapperRef.current;
        const scroller = scrollContainerRef?.current;

        if (wrapper && scroller) {
          const wrapperRect = wrapper.getBoundingClientRect();
          const scrollerRect = scroller.getBoundingClientRect();

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // 「縮んだ後」の状態で、投稿の上端が画面外(上)にあるかチェック
              if (wrapperRect.top < scrollerRect.top) {
                // 要素の上端を、画面上端(＋オフセット)に合わせる
                // scrollIntoViewのような挙動を手動計算で行う
                const targetScrollTop =
                  scroller.scrollTop + (wrapperRect.top - scrollerRect.top);

                scroller.scrollTo({
                  top: targetScrollTop,
                  behavior: "auto", // アニメーションなしで即時移動
                });
              }
            });
          });
        }
      });
    } else {
      // 🔼 Show More (開く)
      // こちらはアニメーションさせたいので普通に更新
      setExpanded(true);
    }
  };

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

  // ■ 状態判定
  // 1. disableCollapse なら全表示
  // 2. expanded なら全表示
  // 3. 計測完了済み(isMeasurementDone) で、かつ短い投稿(!isTruncated) と判明したら全表示
  // 4. それ以外（初期ロード中、または長い投稿の未展開時）は省略表示
  const isCollapsed =
    !disableCollapse && !expanded && !(isMeasurementDone && !isTruncated);

  // ✅ 高さのターゲット計算
  // 初期状態(isMeasurementDone=false)は isTruncated=true なので COLLAPSED_HEIGHT になる
  const targetHeight = disableCollapse
    ? "auto"
    : expanded
    ? "auto"
    : !isTruncated
    ? "auto"
    : COLLAPSED_HEIGHT;

  return (
    <>
      {firstMediaHTML && (
        <div className="mt-2">
          <MathRenderer html={firstMediaHTML} />
        </div>
      )}

      {hasRestContent && (
        <>
          {disableCollapse ? (
            // 🔥 FULL DISPLAY MODE (Modal Mode)
            <div className="mt-2">
              <MathRenderer
                html={restHTML}
                openLinksInNewTab={disableCollapse}
              />
            </div>
          ) : (
            // 🔥 FEED COLLAPSE MODE
            <>
              <motion.div
                ref={contentRef}
                initial={false}
                animate={{ height: targetHeight }}
                transition={{
                  duration: expanded ? 0.3 : 0,
                  ease: "easeInOut",
                }}
                className="relative overflow-hidden mt-2"
                style={{
                  maxHeight:
                    !expanded && (isTruncated || !isMeasurementDone)
                      ? COLLAPSED_HEIGHT
                      : undefined,
                }}
              >
                <div className={expanded ? "pb-4" : ""}>
                  <MathRenderer html={restHTML} />
                </div>

                {isCollapsed && (
                  <div
                    className="
                absolute bottom-0 left-0 w-full h-24
                bg-gradient-to-t from-white via-white/80 to-transparent
                dark:from-black dark:via-black/80
                pointer-events-none
              "
                  />
                )}
              </motion.div>

              {isMeasurementDone && (isTruncated || expanded) && (
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
