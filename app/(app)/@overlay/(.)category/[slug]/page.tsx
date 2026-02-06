"use client";

import { useRouter, useParams } from "next/navigation";
import PostOverlayShell from "@/app/(app)/posts/[id]/PostOverlayShell";
import CategoryPageClientWrapper from "@/app/(app)/category/[slug]/CategoryPageClientWrapper";

/**
 * CategoryOverlayPage
 *
 * This page renders a category feed inside a post-style overlay.
 *
 * Purpose:
 * - Display category content as a modal/overlay
 * - Preserve the underlying page state (scroll, feed, videos, etc.)
 * - Allow users to close the overlay and return via history.back()
 *
 * This is NOT a normal page replacement.
 * It is mounted as an overlay layer on top of the existing app UI.
 */
export default function CategoryOverlayPage() {
  const router = useRouter();

  // Read dynamic route parameters (e.g. /category/[slug])
  const params = useParams<{ slug: string }>();

  return (
    /**
     * PostOverlayShell
     *
     * Responsibilities:
     * - Render a full-screen overlay container
     * - Provide a shared scroll container
     * - Handle backdrop / close gestures
     *
     * onClose:
     * - Uses router.back() to restore the previous route
     * - Ensures browser history remains correct
     */
    <PostOverlayShell onClose={() => router.back()}>
      {(scrollRef) => (
        /**
         * CategoryPageClientWrapper
         *
         * - Receives the category slug from route params
         * - Performs all data fetching & pagination
         * - Renders category content inside the overlay
         *
         * scrollContainerRef:
         * - Provided by PostOverlayShell
         * - Allows the category page to:
         *   - Attach infinite scroll observers
         *   - Share scroll state with the overlay shell
         */
        <CategoryPageClientWrapper
          slug={params.slug}
          scrollContainerRef={scrollRef}
        />
      )}
    </PostOverlayShell>
  );
}
