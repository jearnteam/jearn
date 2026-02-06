// app/(app)/posts/[id]/loading.tsx
import FullScreenLoader from "@/components/common/FullScreenLoader";

/**
 * Route Loading UI (Post Overlay)
 *
 * Automatically rendered by Next.js while
 * the /posts/[id] overlay route is resolving.
 *
 * Uses the global FullScreenLoader, which provides:
 * - Animated owl loader
 * - Fade in / fade out animation
 * - Consistent loading UX across the app
 *
 * This loader appears:
 * - When opening a post overlay
 * - While server components / data are loading
 *
 * Lifecycle is fully controlled by Next.js.
 */
export default function Loading() {
  return <FullScreenLoader text="Loading Post" />;
}
