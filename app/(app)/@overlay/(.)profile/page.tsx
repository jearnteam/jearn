"use client";

import { useRouter } from "next/navigation";
import PostOverlayShell from "@/app/(app)/posts/[id]/PostOverlayShell";
import ProfilePage from "@/app/(app)/profile/page";

export default function ProfileOverlayPage() {
  const router = useRouter();

  return (
    <PostOverlayShell onClose={() => router.back()}>
      {(scrollRef) => <ProfilePage scrollContainerRef={scrollRef} />}
    </PostOverlayShell>
  );
}
