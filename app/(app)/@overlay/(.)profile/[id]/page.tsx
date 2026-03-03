"use client";

import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import PostOverlayShell from "@/app/(app)/posts/[id]/PostOverlayShell";
import ProfileUserClient from "@/app/(app)/profile/[id]/ProfileUserClient";
import ChatRoomClient from "@/components/chat/ChatRoomClient";

export default function ProfileUserOverlayPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  return (
    <>
      <PostOverlayShell onClose={() => router.back()}>
        {(scrollRef) => (
          <ProfileUserClient
            userId={params.id}
            scrollContainerRef={scrollRef}
            onOpenRoom={(roomId) => setActiveRoomId(roomId)} // 🔥 pass handler
          />
        )}
      </PostOverlayShell>

      {/* 🔥 CHAT OVERLAY */}
      {activeRoomId && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex justify-center items-center">
          <div className="w-full max-w-[720px] h-full bg-white dark:bg-black">
            <ChatRoomClient
              roomId={activeRoomId}
              onClose={() => setActiveRoomId(null)}
            />
          </div>
        </div>
      )}
    </>
  );
}