"use client";

import { useParams, notFound } from "next/navigation";
import { useEffect, useState } from "react";
import ChatOverlayShell from "@/components/chat/ChatOverlayShell";
import ChatRoomClient from "@/components/chat/ChatRoomClient";
import FullScreenLoader from "@/components/common/FullScreenLoader";

export default function ChatOverlayPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roomId) setLoading(false);
  }, [roomId]);

  if (loading) {
    return <FullScreenLoader text="Loading chat…" />;
  }

  if (!roomId) {
    return notFound();
  }

  // 🔑 SINGLE SOURCE OF TRUTH
  const closeRoom = () => {
    history.back(); // or your overlay-state close
  };

  return (
    <ChatOverlayShell onClose={closeRoom}>
      <ChatRoomClient
        roomId={roomId}
        onClose={closeRoom}   // ✅ THIS WAS MISSING
      />
    </ChatOverlayShell>
  );
}
