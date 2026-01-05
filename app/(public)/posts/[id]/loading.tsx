// app/(app)/posts/[id]/loading.tsx
import FullScreenLoader from "@/components/common/FullScreenLoader";

export default function Loading() {
  return <FullScreenLoader text="Loading Post…" />;
}
