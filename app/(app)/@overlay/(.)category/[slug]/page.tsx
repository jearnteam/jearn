"use client";

import { useRouter, useParams } from "next/navigation";
import PostOverlayShell from "@/app/(app)/posts/[id]/PostOverlayShell";
import CategoryPageClientWrapper from "@/app/(app)/category/[slug]/CategoryPageClientWrapper";

export default function CategoryOverlayPage() {
  const router = useRouter();
  const params = useParams<{ slug: string }>();

  return (
    <PostOverlayShell onClose={() => router.back()}>
      {(scrollRef) => (
        <CategoryPageClientWrapper
          slug={params.slug}
          scrollContainerRef={scrollRef}
        />
      )}
    </PostOverlayShell>
  );
}
