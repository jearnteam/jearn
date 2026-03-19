"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  SwitchCamera,
} from "lucide-react";
import { useCall } from "@/features/call/CallProvider";
import { avatarUrl } from "@/lib/avatarUrl";

export default function CallScreen() {
  const {
    localStream,
    remoteStreams,
    callStatus,
    activeCall,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
  } = useCall();

  const localMainRef = useRef<HTMLVideoElement | null>(null);
  const remoteMainRef = useRef<HTMLVideoElement | null>(null);
  const localPipRef = useRef<HTMLVideoElement | null>(null);
  const remotePipRef = useRef<HTMLVideoElement | null>(null);

  const [mainView, setMainView] = useState<"local" | "remote">("remote");
  const [snapping, setSnapping] = useState(false);

  /* ===== Streams ===== */
  const participant = useMemo(() => {
    const entries = Object.entries(remoteStreams);
    return entries.length > 0 ? entries[0] : null;
  }, [remoteStreams]);

  const remoteStream = participant?.[1] ?? null;
  const remoteUserId = participant?.[0] ?? "";

  /* ===== Track state ===== */
  const hasLocalVideo =
    !!localStream?.getVideoTracks()[0] &&
    localStream.getVideoTracks()[0].readyState === "live";

  const hasRemoteVideo = !!remoteStream
    ?.getVideoTracks()
    .some((t) => t.readyState === "live" && t.enabled !== false);

  const isMuted =
    !localStream?.getAudioTracks()[0] ||
    !localStream.getAudioTracks()[0].enabled;

  const canShowLocal = !!localStream;
  const canShowRemote = !!remoteStream;

  /* ===== Views ===== */
  const effectiveMain = useMemo(() => {
    if (mainView === "local") {
      if (canShowLocal) return "local";
      if (canShowRemote) return "remote";
      return null;
    }
    if (canShowRemote) return "remote";
    if (canShowLocal) return "local";
    return null;
  }, [mainView, canShowLocal, canShowRemote]);

  const pipView = useMemo(() => {
    if (effectiveMain === "local" && hasRemoteVideo) return "remote";
    if (effectiveMain === "remote" && hasLocalVideo) return "local";
    return null;
  }, [effectiveMain, hasLocalVideo, hasRemoteVideo]);

  const canSwitch =
    hasLocalVideo &&
    hasRemoteVideo &&
    localMainRef.current &&
    remoteMainRef.current;

  const swapMain = () => {
    if (!canSwitch) return;
    setMainView((p) => (p === "local" ? "remote" : "local"));
  };

  /* ===== Tap ===== */
  const lastTapRef = useRef(0);
  const movedRef = useRef(false);

  const handleTap = (cb: () => void) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && !movedRef.current) {
      cb();
    }
    lastTapRef.current = now;
  };

  /* ===== STREAM ATTACH (CRITICAL FIX) ===== */
  useEffect(() => {
    const attach = (el: HTMLVideoElement | null, stream: MediaStream | null, muted = false) => {
      if (!el) return;
      if (el.srcObject !== stream) el.srcObject = stream;
      el.muted = muted;
      el.playsInline = true;
      el.autoplay = true;
      el.play().catch(() => {});
    };

    const detach = (el: HTMLVideoElement | null) => {
      if (!el) return;
      if (el.srcObject) el.srcObject = null;
    };

    /* LOCAL */
    if (effectiveMain === "local") {
      attach(localMainRef.current, localStream, true);
      detach(localPipRef.current);
    } else {
      attach(localPipRef.current, localStream, true);
      detach(localMainRef.current);
    }

    /* REMOTE */
    if (effectiveMain === "remote") {
      attach(remoteMainRef.current, remoteStream, false);
      detach(remotePipRef.current);
    } else {
      attach(remotePipRef.current, remoteStream, false);
      detach(remoteMainRef.current);
    }
  }, [localStream, remoteStream, effectiveMain]);

  /* ===== PiP DRAG ===== */
  const PREVIEW_W = 128;
  const PREVIEW_H = 176;
  const SAFE = 16;
  const BOTTOM_UI = 80;

  const [pos, setPos] = useState({ x: SAFE, y: SAFE });
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0 });

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    movedRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    offsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;

    const dx = Math.abs(e.clientX - pointerStartRef.current.x);
    const dy = Math.abs(e.clientY - pointerStartRef.current.y);
    if (dx > 6 || dy > 6) movedRef.current = true;

    setPos({
      x: Math.max(SAFE, Math.min(window.innerWidth - PREVIEW_W - SAFE, e.clientX - offsetRef.current.x)),
      y: Math.max(SAFE, Math.min(window.innerHeight - PREVIEW_H - SAFE - BOTTOM_UI, e.clientY - offsetRef.current.y)),
    });
  };

  const onPointerUp = () => {
    if (!draggingRef.current) return;

    draggingRef.current = false;

    const centerX = pos.x + PREVIEW_W / 2;
    const snapLeft = centerX < window.innerWidth / 2;

    const newX = snapLeft ? SAFE : window.innerWidth - PREVIEW_W - SAFE;
    const newY = Math.max(SAFE, Math.min(window.innerHeight - PREVIEW_H - SAFE - BOTTOM_UI, pos.y));

    setSnapping(true);
    setPos({ x: newX, y: newY });

    setTimeout(() => setSnapping(false), 200);
  };

  if (!(callStatus === "connecting" || callStatus === "in-call")) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black text-white">

      {/* CLICK LAYER */}
      <div
        className="absolute inset-0 z-20"
        onClick={() => {
          if (!canSwitch) return;
          handleTap(swapMain);
        }}
      />

      {/* MAIN */}
      <div className="absolute inset-0">
        <video
          ref={localMainRef}
          className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none ${
            effectiveMain === "local" ? "z-10" : "opacity-0"
          }`}
        />

        <video
          ref={remoteMainRef}
          className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${
            effectiveMain === "remote" ? "z-10" : "opacity-0"
          }`}
        />

        {!hasLocalVideo && effectiveMain === "local" && (
          <Avatar userId={activeCall?.peerUserId} />
        )}

        {!hasRemoteVideo && effectiveMain === "remote" && (
          <Avatar userId={remoteUserId} />
        )}
      </div>

      {/* PiP */}
      {pipView && (
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={() =>
            handleTap(() => {
              if (!movedRef.current) setMainView(pipView);
            })
          }
          style={{ left: pos.x, top: pos.y }}
          className={`absolute z-30 h-44 w-32 overflow-hidden rounded-xl border border-white/10 touch-none ${
            snapping ? "transition-all duration-200 ease-out" : ""
          }`}
        >
          {pipView === "local" ? (
            <video ref={localPipRef} className="w-full h-full object-cover scale-x-[-1]" />
          ) : (
            <video ref={remotePipRef} className="w-full h-full object-cover" />
          )}
        </div>
      )}

      {/* CONTROLS */}
      <div className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2 flex gap-4">
        <ControlButton onClick={toggleMute}>
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
        </ControlButton>

        <ControlButton onClick={toggleCamera}>
          {hasLocalVideo ? <Video size={20} /> : <VideoOff size={20} />}
        </ControlButton>

        <ControlButton onClick={switchCamera}>
          <SwitchCamera size={20} />
        </ControlButton>

        <button
          onClick={endCall}
          className="h-14 w-14 rounded-full bg-red-600 flex items-center justify-center"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}

function Avatar({ userId }: { userId?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="h-20 w-20 rounded-full overflow-hidden bg-zinc-700 ring-2 ring-white/20">
        <img src={avatarUrl(userId || "")} className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

function ControlButton({ children, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center"
    >
      {children}
    </button>
  );
}