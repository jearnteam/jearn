"use client";

import { PhoneOff } from "lucide-react";
import { useCall } from "@/features/call/CallProvider";
import { avatarUrl } from "@/lib/avatarUrl";
import { useRef, useState } from "react";

export default function CallBar() {
  const {
    minimized,
    setMinimized,
    activeCall,
    callStatus,
    endCall,
    remoteStreams,
  } = useCall();

  const [x, setX] = useState(0);

  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const initialXRef = useRef(0);

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    startXRef.current = e.clientX;
    initialXRef.current = x;

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;

    const dx = e.clientX - startXRef.current;
    const next = initialXRef.current + dx;

    // clamp inside screen
    const max = window.innerWidth - 200; // approx width of bar
    const clamped = Math.max(-max / 2, Math.min(max / 2, next));

    setX(clamped);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    draggingRef.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  if (!minimized || !activeCall) return null;

  const remoteUserId = Object.keys(remoteStreams)[0] || activeCall.peerUserId;

  return (
    <div
      className="
            fixed top-20 left-1/2 z-[9999]
            max-w-lg w-full px-4
            -translate-x-1/2
        "
      style={{
        transform: `translateX(calc(-50% + ${x}px))`,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className="
          flex items-center gap-3
          bg-black text-white
          rounded-full px-4 py-2
          shadow-lg
        "
      >
        {/* AVATAR */}
        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-700">
          <img
            src={avatarUrl(remoteUserId)}
            className="w-full h-full object-cover"
          />
        </div>

        {/* INFO */}
        <div
          className="flex-1 cursor-pointer"
          onClick={() => setMinimized(false)}
        >
          <div className="text-sm font-medium">
            {activeCall.peerUserName || "User"}
          </div>
          <div className="text-xs text-zinc-400">
            {callStatus === "connecting" ? "Connecting..." : "In call"}
          </div>
        </div>

        {/* END BUTTON */}
        <button
          onClick={endCall}
          className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center"
        >
          <PhoneOff size={16} />
        </button>
      </div>
    </div>
  );
}
