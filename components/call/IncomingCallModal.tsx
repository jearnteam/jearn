"use client";

import { Phone, PhoneOff, Video } from "lucide-react";
import { useCall } from "@/features/call/CallProvider";

export default function IncomingCallModal() {
  const { incomingCall, callStatus, acceptIncomingCall, rejectIncomingCall } = useCall();

  if (!incomingCall || callStatus !== "incoming") return null;

  return (
    <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl p-6 text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          {incomingCall.mode === "video" ? <Video size={28} /> : <Phone size={28} />}
        </div>

        <h2 className="text-lg font-semibold">Incoming {incomingCall.mode} call</h2>
        <p className="mt-2 text-sm text-gray-500 break-all">
          From user: {incomingCall.fromUserId}
        </p>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={rejectIncomingCall}
            className="h-14 w-14 rounded-full bg-red-600 text-white flex items-center justify-center"
          >
            <PhoneOff size={22} />
          </button>

          <button
            onClick={acceptIncomingCall}
            className="h-14 w-14 rounded-full bg-emerald-600 text-white flex items-center justify-center"
          >
            <Phone size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}