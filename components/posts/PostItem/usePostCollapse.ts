"use client";

import { useEffect, useRef, useState } from "react";

const LINE_HEIGHT = 20;
const FULL_LINES_LIMIT = 10;

export function usePostCollapse(html: string) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const full = el.scrollHeight;
    const limit = LINE_HEIGHT * FULL_LINES_LIMIT;
    setCollapsedHeight(full > limit ? limit : null);
  }, [html]);

  return {
    ref,
    expanded,
    setExpanded,
    collapsedHeight,
    shouldTruncate: collapsedHeight !== null,
  };
}
