import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void>,
  threshold = 80
) {
  const startY = useRef<number | null>(null);
  const isTouchingRef = useRef(false); // ← 追加
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const locked = useRef(false);
  const hitThresholdRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const lockScroll = () => {
      if (!locked.current) {
        el.style.overflowY = "hidden";
        locked.current = true;
      }
    };

    const unlockScroll = () => {
      if (locked.current) {
        el.style.overflowY = "auto";
        locked.current = false;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      isTouchingRef.current = true;

      startY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isTouchingRef.current) return;
      if (startY.current === null || refreshing) return;

      const rawDelta = e.touches[0].clientY - startY.current;
      if (rawDelta > 0 && el.scrollTop <= 1) {
        lockScroll();

        const dampedDelta = threshold * Math.log1p(rawDelta / threshold);

        const clamped = Math.min(dampedDelta, threshold + 40);
        setPullY(clamped);

        // 🔑 threshold 到達の瞬間
        if (!hitThresholdRef.current && clamped >= threshold) {
          hitThresholdRef.current = true;

          if ("vibrate" in navigator) {
            navigator.vibrate(6);
          }
        }
      }
    };

    const onTouchEnd = async () => {
      const shouldRefresh =
        isTouchingRef.current && pullY >= threshold && !refreshing;

      // 🔑 先に「指を離した」ことを確定
      isTouchingRef.current = false;

      if (shouldRefresh) {
        setRefreshing(true);
        await onRefresh();
        setRefreshing(false);
      }

      setPullY(0);
      startY.current = null;
      unlockScroll();
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);

    return () => {
      unlockScroll();
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [containerRef, onRefresh, pullY, refreshing, threshold]);

  return { pullY, refreshing };
}
