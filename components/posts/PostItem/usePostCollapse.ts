"use client";

import { useLayoutEffect, useRef, useState } from "react";

const LINE_HEIGHT = 20;
const FULL_LINES_LIMIT = 10;

export function usePostCollapse(html: string) {
  const measureRef = useRef<HTMLDivElement | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [fullHeight, setFullHeight] = useState<number>(0);
  const [initialized, setInitialized] = useState(false);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const limit = LINE_HEIGHT * FULL_LINES_LIMIT;

    const measure = () => {
      const style = getComputedStyle(el);
      const paddingBottom = parseFloat(style.paddingBottom || "0");

      const full = el.scrollHeight + paddingBottom;

      setFullHeight(full);
      setCollapsedHeight(full > limit ? limit : null);
      setInitialized(true);
    };

    requestAnimationFrame(measure);

    const ro = new ResizeObserver(measure);
    ro.observe(el);

    return () => ro.disconnect();
  }, [html]);

  return {
    measureRef,
    expanded,
    setExpanded,
    collapsedHeight,
    fullHeight,
    initialized,
    shouldTruncate: initialized && collapsedHeight !== null,
  };
}
