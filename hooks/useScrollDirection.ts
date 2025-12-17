"use client";

import { useEffect, useState } from "react";

export type ScrollDirection = "up" | "down";

export function useScrollDirection(threshold = 12): ScrollDirection {
  const [direction, setDirection] = useState<ScrollDirection>("up");

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      const currentY = window.scrollY;

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const diff = currentY - lastY;

          if (Math.abs(diff) > threshold) {
            setDirection(diff > 0 ? "down" : "up");
            lastY = currentY;
          }

          ticking = false;
        });

        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return direction;
}
