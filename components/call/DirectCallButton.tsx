"use client";

import { Phone, Video } from "lucide-react";
import { useState } from "react";
import { useCall } from "@/features/call/CallProvider";
import type { Partner } from "@/components/chat/ChatRoomClient";

interface Props {
  roomId: string;
  partner: Partner;
}

export default function DirectCallButton({ roomId, partner }: Props) {
  const [loading, setLoading] = useState<"audio" | "video" | null>(null);
  const { startCall } = useCall();

  async function start(mode: "audio" | "video") {
    if (loading) return;

    try {
      setLoading(mode);

      // ✅ Create call record (backend)
      const res = await fetch("/api/calls/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ roomId, mode }),
      });

      if (!res.ok) {
        console.error("Call start failed");
        return;
      }

      const data = await res.json();

      // 🔥 IMPORTANT: use NEW SFU flow
      startCall({
        callId: data.callId,
        peerUserId: data.calleeId,
        peerUserName: partner.name,
        mode,
      });
    } catch (err) {
      console.error("Start call error:", err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={loading !== null}
        onClick={() => start("audio")}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Phone size={18} />
      </button>

      <button
        disabled={loading !== null}
        onClick={() => start("video")}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Video size={18} />
      </button>
    </div>
  );
}