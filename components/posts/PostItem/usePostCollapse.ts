"use client";

import { useLayoutEffect, useRef, useState } from "react";

const LINE_HEIGHT = 20;
const FULL_LINES_LIMIT = 10;

export function usePostCollapse(html: string) {
  const measureRef = useRef<HTMLDivElement | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  const [fullHeight, setFullHeight] = useState(0);
  const [initialized, setInitialized] = useState(false);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const measure = () => {
      const full = el.getBoundingClientRect().height;

      setFullHeight(full);

      if (full > 400) {
        setCollapsedHeight(250); // collapse to 250px
      } else {
        setCollapsedHeight(null);
      }

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
