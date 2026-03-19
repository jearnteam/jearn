"use client";

import { PhoneOff, Minus } from "lucide-react";
import { useCall } from "@/features/call/CallProvider";
import { useEffect, useRef, useState } from "react";
import { avatarUrl } from "@/lib/avatarUrl";

export default function OutgoingCallScreen() {
  const { activeCall, callStatus, endCall } = useCall();
  const [minimized, setMinimized] = useState(false);

  const PREVIEW_W = 128;
  const PREVIEW_H = 160;
  const SAFE = 16;
  const BOTTOM_UI = 80;

  const [pos, setPos] = useState({ x: SAFE, y: SAFE });
  const [snapping, setSnapping] = useState(false);

  const draggingRef = useRef(false);
  const movedRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    movedRef.current = false;

    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    offsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;

      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);
      if (dx > 6 || dy > 6) movedRef.current = true;

      const newX = Math.max(
        SAFE,
        Math.min(
          window.innerWidth - PREVIEW_W - SAFE,
          e.clientX - offsetRef.current.x
        )
      );

      const newY = Math.max(
        SAFE,
        Math.min(
          window.innerHeight - PREVIEW_H - SAFE - BOTTOM_UI,
          e.clientY - offsetRef.current.y
        )
      );

      setPos({ x: newX, y: newY });
    };

    const handleUp = () => {
      if (!draggingRef.current) return;

      draggingRef.current = false;

      setPos((prev) => {
        const centerX = prev.x + PREVIEW_W / 2;
        const snapLeft = centerX < window.innerWidth / 2;

        const newX = snapLeft
          ? SAFE
          : window.innerWidth - PREVIEW_W - SAFE;

        setSnapping(true);
        window.setTimeout(() => setSnapping(false), 200);

        return { ...prev, x: newX };
      });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, []);

  if (callStatus !== "calling" || !activeCall) return null;

  if (minimized) {
    return (
      <div
        onPointerDown={onPointerDown}
        onClick={() => {
          if (!movedRef.current) setMinimized(false);
        }}
        style={{ left: pos.x, top: pos.y }}
        className={`
          fixed z-[120] h-40 w-32 rounded-xl overflow-hidden
          border border-zinc-200 dark:border-zinc-700
          bg-white dark:bg-zinc-900 shadow-xl
          cursor-grab active:cursor-grabbing
          touch-none select-none
          ${snapping ? "transition-all duration-200 ease-out" : ""}
        `}
      >
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <div className="animate-[pulse_1.5s_ease-in-out_infinite]">
            <div className="w-14 h-14 rounded-full overflow-hidden">
              <img
                src={avatarUrl(activeCall.peerUserId)}
                alt="avatar"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Calling...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[120] bg-white dark:bg-black text-zinc-900 dark:text-white flex flex-col">
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setMinimized(true)}
          className="p-2 rounded-full bg-black/10 dark:bg-white/10 hover:scale-95 transition"
        >
          <Minus size={18} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
          <div className="relative z-10 w-28 h-28 rounded-full overflow-hidden bg-zinc-200 dark:bg-zinc-700">
            <img
              src={avatarUrl(activeCall.peerUserId)}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <h2 className="text-2xl font-semibold">{activeCall.peerUserName}</h2>

        <p className="text-zinc-500 dark:text-zinc-400 mt-2 text-sm animate-pulse">
          Calling...
        </p>
      </div>

      <div className="pb-12 flex justify-center">
        <button onClick={endCall} className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-red-500 flex items-center justify-center shadow-xl active:scale-95 transition">
            <PhoneOff size={28} />
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Cancel
          </span>
        </button>
      </div>
    </div>
  );
}