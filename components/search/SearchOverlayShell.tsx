"use client";

import { ReactNode, useEffect, useRef } from "react";

interface Props {
  children: (scrollRef: React.RefObject<HTMLDivElement | null>) => ReactNode;
  onClose: () => void;
}

export default function SearchOverlayShell({ children, onClose }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* Lock background scroll */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 bg-white dark:bg-black">
      {/* Backdrop (below navbar) */}
      <div
        className="absolute inset-x-0 top-16 bottom-0"
        onClick={onClose}
      />

      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="
          absolute inset-x-0 top-16 bottom-0
          overflow-y-auto no-scrollbar
        "
      >
        {children(scrollRef)}
      </div>
    </div>
  );
}
