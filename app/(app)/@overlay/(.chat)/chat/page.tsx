"use client";

import { useRouter } from "next/navigation";
import ChatOverlayShell from "@/components/chat/ChatOverlayShell";
import ChatListClient from "@/components/chat/ChatListClient";

export default function ChatListOverlayPage() {
  const router = useRouter();

  return (
    <ChatOverlayShell onClose={() => router.back()}>
      <ChatListClient
        onOpenRoom={(roomId) => {
          router.push(`/chat/${roomId}`, { scroll: false });
        }}
      />
    </ChatOverlayShell>
  );
}
