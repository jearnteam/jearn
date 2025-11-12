"use client";

import { useEffect, useRef, useState } from "react";
import lottie from "lottie-web";
import { useTheme } from "next-themes";

export default function LoadingOwl() {
  const container = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // ✅ Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !container.current) return;

    container.current.innerHTML = ""; // reset animation on theme change
    const anim = lottie.loadAnimation({
      container: container.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: "/owl_draw.json",
    });

    anim.setSpeed(0.8);
    return () => anim.destroy();
  }, [mounted, resolvedTheme]);

  // 🚫 Render placeholder during SSR
  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-screen bg-transparent">
        <div style={{ width: 200, height: 200 }} />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-screen bg-transparent">
      <div
        ref={container}
        style={{
          width: 200,
          height: 200,
          filter:
            resolvedTheme === "dark"
              ? "invert(1) brightness(1.2)"
              : "invert(0)",
          transition: "filter 0.4s ease",
        }}
      />
    </div>
  );
}
