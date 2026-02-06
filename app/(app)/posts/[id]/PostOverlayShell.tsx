// app/(app)/posts/[id]/PostOverlayShell.tsx
"use client";

import { ReactNode, useEffect, useRef } from "react";

interface Props {
  /**
   * Render-prop children
   *
   * Receives a scroll container ref so that
   * nested content (posts, categories, etc.)
   * can attach infinite scroll logic or observers.
   */
  children: (scrollRef: React.RefObject<HTMLDivElement | null>) => ReactNode;

  /**
   * Called when the overlay should be dismissed.
   * Usually implemented as router.back().
   */
  onClose: () => void;
}

/**
 * PostOverlayShell
 *
 * Responsibilities:
 * - Render a full-screen overlay above the app
 * - Lock background body scrolling
 * - Provide a dedicated scroll container
 * - Capture backdrop clicks to close the overlay
 *
 * This component does NOT:
 * - Fetch data
 * - Know about routes
 * - Know about post/category logic
 */
export default function PostOverlayShell({ children, onClose }: Props) {
  // Scroll container ref shared with child content
  const scrollRef = useRef<HTMLDivElement | null>(null);

  /* --------------------------------------------------
   * Lock body scroll while overlay is open
   * ------------------------------------------------ */
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  return (
    /**
     * ROOT OVERLAY
     *
     * - fixed + inset-0 ensures full-screen coverage
     * - High z-index places overlay above main app UI
     * - Fully opaque background prevents visual bleed
     */
    <div className="fixed inset-0 z-40 bg-white dark:bg-black">
      {/* --------------------------------------------------
       * BACKDROP
       *
       * - Covers the area below the top navbar
       * - Clicking closes the overlay
       * - Allows "tap outside to close" UX
       * ------------------------------------------------ */}
      <div
        className="absolute inset-x-0 top-[4.3rem] bottom-0"
        onClick={onClose}
      />

      {/* --------------------------------------------------
       * SCROLL CONTAINER
       *
       * - Owns all vertical scrolling for overlay content
       * - Prevents background scroll bleed
       * - Ref is passed to children via render-prop
       * ------------------------------------------------ */}
      <div
        ref={scrollRef}
        className="
          absolute inset-x-0
          top-[4.3rem] bottom-0
          overflow-y-auto
          no-scrollbar
        "
      >
        {/* Content wrapper for consistent feed spacing */}
        <div className="feed-container py-6 space-y-10">
          {children(scrollRef)}
        </div>
      </div>
    </div>
  );
}
