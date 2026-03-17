"use client";

import { Phone, Video } from "lucide-react";
import { useState } from "react";
import { useChatSocket } from "@/features/chat/ChatSocketProvider";
import { useCall } from "@/features/call/CallProvider";

interface Props {
  roomId: string;
}

export default function DirectCallButton({ roomId }: Props) {
  const [loading, setLoading] = useState<"audio" | "video" | null>(null);
  const { send, currentUserId } = useChatSocket();
  const { startOutgoingCall } = useCall();

  async function startCall(mode: "audio" | "video") {
    if (loading) return;

    try {
      setLoading(mode);

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

      console.log("Call started:", data);

      startOutgoingCall({
        callId: data.callId,
        peerUserId: data.calleeId,
        roomName: data.roomName,
        mode,
      });
      
      send({
        type: "call:start",
        targetUserId: data.calleeId,
        callId: data.callId,
        roomName: data.roomName,
        mode,
        fromUserId: currentUserId,
      });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={loading !== null}
        onClick={() => startCall("audio")}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Phone size={18} />
      </button>

      <button
        disabled={loading !== null}
        onClick={() => startCall("video")}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <Video size={18} />
      </button>
    </div>
  );
}
