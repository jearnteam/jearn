"use client";

import { useRouter } from "next/navigation";
import PostOverlayShell from "@/app/(app)/posts/[id]/PostOverlayShell";
import TagPageClientWrapper from "@/app/(app)/tags/[tag]/TagPageClientWrapper";

export default function TagOverlayPage() {
  const router = useRouter();

  return (
    <PostOverlayShell onClose={() => router.back()}>
      {(scrollRef) => (
        <TagPageClientWrapper
          scrollContainerRef={scrollRef} // ✅ NOW WIRED
        />
      )}
    </PostOverlayShell>
  );
}
