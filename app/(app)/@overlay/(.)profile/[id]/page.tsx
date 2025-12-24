"use client";

import { useRouter, useParams } from "next/navigation";
import PostOverlayShell from "@/app/(app)/posts/[id]/PostOverlayShell";
import ProfileUserClient from "@/app/(app)/profile/[id]/ProfileUserClient";

export default function ProfileUserOverlayPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  return (
    <PostOverlayShell onClose={() => router.back()}>
      {(scrollRef) => (
        <ProfileUserClient userId={params.id} />
      )}
    </PostOverlayShell>
  );
}
