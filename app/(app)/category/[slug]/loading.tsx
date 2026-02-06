// app/(app)/categories/[slug]/loading.tsx
import FullScreenLoader from "@/components/common/FullScreenLoader";

/**
 * Route Loading UI
 *
 * This component is automatically rendered by Next.js
 * while the category route is being resolved.
 *
 * When it appears?
 * - Initial navigation to /categories/[slug]
 * - Server components are loading
 * - Dynamic data is being fetched
 *
 * This is NOT a manual loader.
 * Next.js controls its mount/unmount lifecycle.
 */
export default function Loading() {
  return <FullScreenLoader text="Loading category" />;
}
