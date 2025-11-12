"use client";
import { useEffect, useRef } from "react";
import lottie from "lottie-web";

export default function LoadingOwl() {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current) {
      const anim = lottie.loadAnimation({
        container: container.current,
        renderer: "svg",
        loop: true,                // 🌀 loop forever
        autoplay: true,
        path: "/owl_draw.json",    // your animation file
      });

      // ✨ Elegant speed — not too fast, not too slow
      anim.setSpeed(0.8);

      return () => anim.destroy();
    }
  }, []);

  return (
    <div className="flex items-center justify-center h-screen bg-transparent">
      <div ref={container} style={{ width: 200, height: 200 }}></div>
    </div>
  );
}
