"use client";

import { useSearchParams } from "next/navigation";
import PostOverlayShell from "@/app/(app)/posts/[id]/PostOverlayShell";
import SearchPageClientWrapper from "@/features/search/SearchPageClientWrapper";

export default function SearchOverlayPage() {
  const params = useSearchParams();
  const query = params.get("q");

  if (!query) return null;

  return (
    <PostOverlayShell onClose={() => history.back()}>
      {(scrollRef) => (
        <SearchPageClientWrapper scrollContainerRef={scrollRef} />
      )}
    </PostOverlayShell>
  );
}
