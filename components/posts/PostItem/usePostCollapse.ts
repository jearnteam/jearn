"use client";

import { useState, useRef, useLayoutEffect } from "react";

export const COLLAPSED_HEIGHT = 250;

export function usePostCollapse() {
  const contentRef = useRef<HTMLDivElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [needsCollapse, setNeedsCollapse] = useState(false);

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    // Measure once
    const fullHeight = el.scrollHeight;

    if (fullHeight > COLLAPSED_HEIGHT) {
      setNeedsCollapse(true);
    }
  }, []);

  return {
    contentRef,
    expanded,
    setExpanded,
    needsCollapse,
  };
}
