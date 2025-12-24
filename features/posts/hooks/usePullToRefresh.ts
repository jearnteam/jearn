import { useEffect, useRef, useState } from "react";

export function usePullToRefresh(
  containerRef: React.RefObject<HTMLElement | null>,
  onRefresh: () => Promise<void>,
  threshold = 80
) {
  const startY = useRef<number | null>(null);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const locked = useRef(false);

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
      if (el.scrollTop === 0 && !refreshing) {
        startY.current = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (startY.current === null || refreshing) return;

      const delta = e.touches[0].clientY - startY.current;
      if (delta <= 0) return;

      // 🔑 ゴム引きモードへ強制遷移
      lockScroll();

      setPullY(Math.min(delta, threshold + 60));
    };

    const onTouchEnd = async () => {
      if (pullY >= threshold && !refreshing) {
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
