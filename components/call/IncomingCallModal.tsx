"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  call: {
    callId: string;
    fromUserId: string;
    roomName: string;
    mode: "audio" | "video";
  };
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({ call, onAccept, onReject }: Props) {
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="
          w-[320px]
          rounded-2xl
          bg-white dark:bg-neutral-900
          shadow-2xl
          p-6
          flex flex-col items-center
          gap-4
        "
      >
        {/* ICON */}
        <div className="w-16 h-16 rounded-full bg-blue-500 flex items-center justify-center text-white">
          {call.mode === "video" ? <Video size={28} /> : <Phone size={28} />}
        </div>

        {/* TITLE */}
        <div className="text-center">
          <p className="text-lg font-semibold">
            Incoming {call.mode === "video" ? "Video" : "Voice"} Call
          </p>

          <p className="text-sm text-gray-500 mt-1">
            From user {call.fromUserId}
          </p>
        </div>

        {/* BUTTONS */}
        <div className="flex gap-6 mt-4">
          <button
            onClick={onReject}
            className="
              w-14 h-14 rounded-full
              bg-red-500 text-white
              flex items-center justify-center
              hover:bg-red-600
              transition
            "
          >
            <PhoneOff size={22} />
          </button>

          <button
            onClick={onAccept}
            className="
              w-14 h-14 rounded-full
              bg-green-500 text-white
              flex items-center justify-center
              hover:bg-green-600
              transition
            "
          >
            <Phone size={22} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}