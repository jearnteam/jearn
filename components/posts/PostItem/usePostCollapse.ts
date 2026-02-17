"use client";

import { useState, useEffect, useRef } from "react";

export const COLLAPSED_HEIGHT = 250;

export function usePostCollapse() {
  const contentRef = useRef<HTMLDivElement>(null);
  // 初期状態は「省略されている(true)」と仮定してレンダリングを開始する
  const [isTruncated, setIsTruncated] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [isMeasurementDone, setIsMeasurementDone] = useState(false);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const checkHeight = () => {
      // scrollHeight は overflow:hidden されていても本来の高さを返す
      if (el.scrollHeight > COLLAPSED_HEIGHT + 20) {
        setIsTruncated(true);
      } else {
        setIsTruncated(false);
      }
      setIsMeasurementDone(true);
    };

    checkHeight();
    const ro = new ResizeObserver(checkHeight);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  return {
    contentRef,
    isTruncated,
    expanded,
    setExpanded,
    isMeasurementDone,
  };
}