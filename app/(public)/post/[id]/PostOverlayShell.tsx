"use client";

import { ReactNode, useEffect, useRef } from "react";

interface Props {
  children: (scrollRef: React.RefObject<HTMLDivElement | null>) => ReactNode;
  onClose: () => void;
}

export default function PostOverlayShell({ children, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    // 🔒 ROOT — fully opaque immediately
    <div className="fixed inset-0 z-40 bg-white dark:bg-black">
      {/* BACKDROP (optional click area) */}
      <div
        className="absolute inset-x-0 top-[4.3rem] bottom-0"
        onClick={onClose}
      />

      {/* SCROLL CONTAINER */}
      <div
        ref={scrollRef}
        className="
          absolute inset-x-0
          top-[4.3rem] bottom-0
          overflow-y-auto
          no-scrollbar
        "
      >
        <div className="feed-container py-6 space-y-10">
          {children(scrollRef)}
        </div>
      </div>
    </div>
  );
}
