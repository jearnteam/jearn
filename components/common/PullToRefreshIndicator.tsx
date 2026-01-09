type Props = {
  pullY: number;
  refreshing: boolean;
  threshold?: number;
};

import { useState, useEffect } from "react";

export function PullToRefreshIndicator({
  pullY,
  refreshing,
  threshold = 80,
}: Props) {
  const DOTS = 8;
  const RADIUS = 10;
  const BASE_OFFSET = -18;

  // threshold 到達時にカチッ感を出す
  const [overThreshold, setOverThreshold] = useState(false);

  useEffect(() => {
    if (pullY >= threshold && !overThreshold) {
      setOverThreshold(true);
      if ("vibrate" in navigator) navigator.vibrate(10);
    } else if (pullY < threshold && overThreshold) {
      setOverThreshold(false);
    }
  }, [pullY, threshold, overThreshold]);

  // 指に少し遅れてついてくる
  const dampedPull = Math.min(pullY * 0.35, 28);
  const translateY = refreshing
    ? 0
    : BASE_OFFSET + dampedPull + (overThreshold ? 4 : 0);

  return (
    <div
      style={{
        height: refreshing ? 56 : Math.min(pullY, 56),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        transition: refreshing
          ? "height 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
          : "none",
      }}
    >
      {/* ▼ 外側：上下移動専用 */}
      <div
        style={{
          transform: `translateY(${translateY}px)`,
          transition: refreshing
            ? "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)"
            : "none",
        }}
      >
        {/* ▼ 内側：回転専用 */}
        <div
          style={{
            width: 32,
            height: 32,
            position: "relative",
            animation: refreshing ? "dot-spin 0.9s linear infinite" : "none",
          }}
        >
          {Array.from({ length: DOTS }).map((_, i) => {
            const angle = (i / DOTS) * Math.PI * 2 - Math.PI / 2; // 12時方向スタート
            const x = Math.cos(angle) * RADIUS;
            const y = Math.sin(angle) * RADIUS;

            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "currentColor",
                  transform: `translate(${x}px, ${y}px)`,
                  animation: refreshing
                    ? "dot-fade 0.9s linear infinite"
                    : "none",
                  animationDelay: refreshing ? `${(i / DOTS) * 0.9}s` : "0s",
                }}
              />
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes dot-spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes dot-fade {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
