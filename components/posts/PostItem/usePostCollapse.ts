"use client";

import { useEffect, useRef, useState } from "react";

const LINE_HEIGHT = 20;
const FULL_LINES_LIMIT = 10;
const MAX_PREVIEW_IMAGE_HEIGHT = 400;

export function usePostCollapse(
  content: string,
  scrollContainerRef: React.RefObject<HTMLDivElement | null>
) {
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [measureDone, setMeasureDone] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const first = el.querySelector(":scope > *");
    const firstIsImage =
      first instanceof HTMLImageElement && first.hasAttribute("data-type");

    // ---------- TEXT-FIRST ----------
    if (!firstIsImage) {
      requestAnimationFrame(() => {
        const full = el.scrollHeight;
        const limit = LINE_HEIGHT * FULL_LINES_LIMIT;
        setCollapsedHeight(full > limit ? limit : null);
        setMeasureDone(true);
      });
      return;
    }

    // ---------- IMAGE-FIRST ----------
    const img = first as HTMLImageElement;

    function apply(h: number) {
      setCollapsedHeight(Math.min(h, MAX_PREVIEW_IMAGE_HEIGHT));
      setMeasureDone(true);
    }

    if (img.complete) {
      apply(img.offsetHeight || img.naturalHeight || 200);
    } else {
      img.onload = () =>
        apply(img.offsetHeight || img.naturalHeight || 200);
      img.onerror = () => apply(200);
    }
  }, [content]);

  const shouldTruncate = collapsedHeight !== null;
  const targetHeight = expanded ? "auto" : collapsedHeight ?? "auto";

  function toggle() {
    if (!shouldTruncate) return;

    if (expanded) {
      setExpanded(false);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const scroller = scrollContainerRef.current;
          const wrapper = contentRef.current?.parentElement;
          if (!scroller || !wrapper) return;

          const top =
            wrapper.getBoundingClientRect().top -
            scroller.getBoundingClientRect().top +
            scroller.scrollTop;

          scroller.scrollTo({ top, behavior: "smooth" });
        });
      });
    } else {
      setExpanded(true);
    }
  }

  return {
    contentRef,
    expanded,
    toggle,
    targetHeight,
    measureDone,
    shouldTruncate,
  };
}
