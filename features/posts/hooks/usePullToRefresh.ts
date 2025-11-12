import { useEffect, useRef } from "react";

export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement | null>, // ✅ Updated type
  onRefresh: () => Promise<void>,
  threshold = 70
) {
  const startY = useRef<number | null>(null);
  const triggered = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reset = () => {
      startY.current = null;
      triggered.current = false;
    };

    const onTouchStart = (e: TouchEvent) => {
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current !== null) {
        const deltaY = e.touches[0].clientY - startY.current;
        if (deltaY > threshold && !triggered.current) {
          triggered.current = true;
          onRefresh();
        }
      }
    };

    const onTouchEnd = reset;

    el.addEventListener("touchstart", onTouchStart);
    el.addEventListener("touchmove", onTouchMove);
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [containerRef, onRefresh, threshold]);
}
