// app/(app)/categories/[slug]/loading.tsx
import FullScreenLoader from "@/components/common/FullScreenLoader";

export default function Loading() {
  return <FullScreenLoader text="Loading category…" />;
}
