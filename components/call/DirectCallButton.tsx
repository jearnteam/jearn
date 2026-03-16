"use client";

import { Phone, Video } from "lucide-react";
import { useChatSocket } from "@/features/chat/ChatSocketProvider";

interface Props {
  partnerId: string;
}

export default function DirectCallButton({ partnerId }: Props) {
  const { send } = useChatSocket();

  function startCall(mode: "audio" | "video") {
    send({
      type: "call:start",
      targetUserId: partnerId,
      mode,
    });
  }

  return (
    <div className="flex items-center gap-2">
      {/* AUDIO CALL */}
      <button
        onClick={() => startCall("audio")}
        className="
          p-2 rounded-full
          hover:bg-gray-100
          dark:hover:bg-gray-800
          transition
        "
      >
        <Phone size={18} />
      </button>

      {/* VIDEO CALL */}
      <button
        onClick={() => startCall("video")}
        className="
          p-2 rounded-full
          hover:bg-gray-100
          dark:hover:bg-gray-800
          transition
        "
      >
        <Video size={18} />
      </button>
    </div>
  );
}