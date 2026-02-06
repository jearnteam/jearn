// app/(app)/users/[id]/loading.tsx
import FullScreenLoader from "@/components/common/FullScreenLoader";

/**
 * Route Loading UI (User Profile)
 *
 * Automatically rendered by Next.js while the
 * /users/[id] route is being resolved.
 *
 * Uses the global FullScreenLoader, which provides:
 * - Animated owl loader
 * - Fade in / fade out animation
 * - Consistent loading UX across the app
 *
 * Appears when:
 * - Navigating to a user's profile
 * - Server components or dynamic data are loading
 *
 * Lifecycle is fully controlled by Next.js.
 */
export default function Loading() {
  return <FullScreenLoader text="Loading User's Profile" />;
}
