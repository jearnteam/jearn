//@/app/(app)/chat/[roomId]/page.tsx
"use client";

import { useParams, notFound } from "next/navigation";
import { useEffect, useState } from "react";
import ChatOverlayShell from "@/components/chat/ChatOverlayShell";
import ChatRoomClient from "@/components/chat/ChatRoomClient";
import FullScreenLoader from "@/components/common/FullScreenLoader";

/**
 * ChatOverlayPage
 *
 * Renders a chat room inside a full-screen overlay.
 *
 * Purpose:
 * - Display chat without unmounting the underlying app
 * - Preserve background state (feeds, videos)
 * - Allow users to close chat and return via history.back()
 *
 * This page is client-only because it:
 * - Uses browser history
 * - Depends on dynamic route params
 * - Manages client-side loading state
 */
export default function ChatOverlayPage() {
  // Read dynamic route parameter from the URL
  const { roomId } = useParams<{ roomId: string }>();

  // Local loading guard to ensure params are available
  const [loading, setLoading] = useState(true);

  /* --------------------------------------------------
   * Wait for route params to be available
   * ------------------------------------------------ */
  useEffect(() => {
    if (roomId) setLoading(false);
  }, [roomId]);

  /* --------------------------------------------------
   * Loading state
   * ------------------------------------------------ */
  if (loading) {
    return <FullScreenLoader text="Loading chat" />;
  }

  /* --------------------------------------------------
   * Invalid route guard
   * ------------------------------------------------ */
  if (!roomId) {
    return notFound();
  }

  return (
    /**
     * ChatOverlayShell
     *
     * - Provides full-screen overlay container
     * - Locks background scrolling
     * - Handles overlay close gestures
     */
    <ChatOverlayShell onClose={() => history.back()}>
      {/* --------------------------------------------------
       * ChatRoomClient
       *
       * - Handles real-time messaging
       * - Manages socket lifecycle
       * - Renders chat UI
       *
       * onClose:
       * - Closes the overlay
       * - Restores previous route via history
       * ------------------------------------------------ */}
      <ChatRoomClient
        roomId={roomId}
        onClose={() => history.back()}
      />
    </ChatOverlayShell>
  );
}
