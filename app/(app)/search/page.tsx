"use client";

import { useSearchParams, useRouter } from "next/navigation";
import SearchOverlayShell from "@/components/search/SearchOverlayShell";
import SearchPageClientWrapper from "@/components/search/SearchPageClientWrapper";

export default function SearchOverlayPage() {
  const params = useSearchParams();
  const router = useRouter();
  const query = params.get("q");

  if (!query) return null;

  return (
    <SearchOverlayShell onClose={() => router.back()}>
      {(scrollRef) => (
        <SearchPageClientWrapper scrollContainerRef={scrollRef} />
      )}
    </SearchOverlayShell>
  );
}
