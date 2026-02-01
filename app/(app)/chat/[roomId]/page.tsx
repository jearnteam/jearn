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

  return (
    <ChatOverlayShell onClose={() => history.back()}>
      <ChatRoomClient
        roomId={roomId}
        onClose={() => history.back()}
      />
    </ChatOverlayShell>
  );
}
