"use client";

import { useEffect, useRef, useState } from "react";
import lottie from "lottie-web";
import { useTheme } from "next-themes";

export default function LoadingOwl({ theme }: { theme?: "light" | "dark" }) {
  const container = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const effectiveTheme = theme ?? (resolvedTheme === "dark" ? "dark" : "light");

  useEffect(() => {
    if (!mounted || !container.current) return;

    container.current.innerHTML = "";

    const anim = lottie.loadAnimation({
      container: container.current,
      renderer: "svg",
      loop: true,
      autoplay: true,
      path: "/owl_draw.json",
    });

    anim.setSpeed(0.8);

    return () => anim.destroy();
  }, [mounted, effectiveTheme]);

  if (!mounted) {
    return <div style={{ width: 200, height: 200 }} />;
  }

  return (
    <div className="flex items-center justify-center bg-transparent">
      <div
        ref={container}
        style={{
          width: 200,
          height: 200,
          filter:
            effectiveTheme === "dark"
              ? "invert(1) brightness(1.2)"
              : "invert(0)",
        }}
      />
    </div>
  );
}
