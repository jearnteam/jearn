"use client";

import { useEffect, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCall } from "@/features/call/CallProvider";

export default function CallScreen() {
  const {
    activeCall,
    callStatus,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    speakerOn,
    toggleMute,
    toggleCamera,
    toggleSpeaker,
    endCall,
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const [snapping, setSnapping] = useState(false);

  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });
  const userMovedRef = useRef(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const PREVIEW_W = 112;
  const PREVIEW_H = 160;
  const SAFE = 16;
  const BOTTOM_UI = 200;

  const [pos, setPos] = useState({ x: SAFE, y: SAFE });

  /* ---------------- DRAG ---------------- */

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    userMovedRef.current = true;

    offsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return;

    setPos({
      x: Math.max(
        SAFE,
        Math.min(
          window.innerWidth - PREVIEW_W - SAFE,
          e.clientX - offsetRef.current.x
        )
      ),
      y: Math.max(
        SAFE,
        Math.min(
          window.innerHeight - PREVIEW_H - SAFE - BOTTOM_UI,
          e.clientY - offsetRef.current.y
        )
      ),
    });
  };

  const onPointerUp = () => {
    draggingRef.current = false;

    const centerX = pos.x + PREVIEW_W / 2;
    const snapLeft = centerX < window.innerWidth / 2;

    const newX = snapLeft ? SAFE : window.innerWidth - PREVIEW_W - SAFE;

    const newY = Math.max(
      SAFE,
      Math.min(window.innerHeight - PREVIEW_H - SAFE - BOTTOM_UI, pos.y)
    );

    setSnapping(true);
    setPos({ x: newX, y: newY });

    setTimeout(() => setSnapping(false), 200);
  };
  /* ---------------- END CALL ---------------- */

  const handleEndCall = async () => {
    try {
      if (activeCall?.callId) {
        await fetch("/api/calls/end", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ callId: activeCall.callId }),
        });
      }
    } catch (err) {
      console.error("Failed to store call end:", err);
    }

    endCall();
  };

  /* ---------------- REMOTE STREAM ---------------- */

  useEffect(() => {
    const video = remoteVideoRef.current;
    const audio = remoteAudioRef.current;

    if (video) {
      // ✅ Force assignment if the object reference changed
      if (video.srcObject !== remoteStream) {
        video.srcObject = remoteStream ?? null;
      }
      video.playsInline = true;
      video.autoplay = true;
      video.play().catch(() => {});
    }

    if (audio) {
      if (audio.srcObject !== remoteStream) {
        audio.srcObject = remoteStream ?? null;
      }
      audio.muted = !speakerOn;
      audio.autoplay = true;
      audio.play().catch(() => {});
    }
  }, [remoteStream, speakerOn]);

  /* ---------------- LOCAL STREAM ---------------- */

  useEffect(() => {
    const video = localVideoRef.current;

    if (!video) return;

    video.srcObject = localStream ?? null;
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.play().catch(() => {});
  }, [localStream]);

  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
      // You MUST call play() after srcObject changes, otherwise it freezes forever!
      videoRef.current.play().catch((e) => console.log("Play interrupted", e));
    }
  }, [remoteStream]);

  /* ---------------- VIDEO STATE ---------------- */

  const hasRemoteVideo =
    (remoteStream?.getVideoTracks().length ?? 0) > 0 &&
    remoteStream?.getVideoTracks().some((t) => t.readyState !== "ended");

  const hasLocalVideo =
    (localStream?.getVideoTracks().length ?? 0) > 0 &&
    localStream!.getVideoTracks().some((t) => t.readyState !== "ended");

  const showLocalVideo = hasLocalVideo && !isCameraOff;

  /* ---------------- AUTO POSITION ---------------- */

  useEffect(() => {
    if (!showLocalVideo) return;
    if (userMovedRef.current) return;

    const x = window.innerWidth - PREVIEW_W - SAFE;
    const y = window.innerHeight - PREVIEW_H - SAFE - BOTTOM_UI;

    setPos({ x, y });
  }, [showLocalVideo, activeCall]);

  /* ---------------- RESIZE CLAMP ---------------- */

  useEffect(() => {
    const clamp = () => {
      setPos((prev) => ({
        x: Math.max(
          SAFE,
          Math.min(window.innerWidth - PREVIEW_W - SAFE, prev.x)
        ),
        y: Math.max(
          SAFE,
          Math.min(window.innerHeight - PREVIEW_H - SAFE - BOTTOM_UI, prev.y)
        ),
      }));
    };

    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, []);

  if (!activeCall) return null;

  const peerId = activeCall.peerUserId;

  return (
    <div className="fixed inset-0 z-[130] bg-black text-white">
      <div className="flex h-full flex-col">
        {/* TOP INFO */}
        <div className="px-6 pt-10 text-center">
          <div className="text-xl font-semibold">
            {callStatus === "in-call" ? "In call" : "Connecting…"}
          </div>
          <div className="mt-2 text-sm text-white/70 break-all">{peerId}</div>
        </div>

        {/* VIDEO AREA */}
        <div className="relative flex-1 overflow-hidden">
          <audio ref={remoteAudioRef} autoPlay playsInline />
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 h-full w-full object-cover bg-black"
          />
          {!hasRemoteVideo && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-zinc-700 text-3xl font-bold">
                {peerId.slice(0, 2).toUpperCase()}
              </div>
            </div>
          )}

          {showLocalVideo && (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              className={`absolute h-40 w-28 rounded-2xl object-cover bg-zinc-800 ring-1 ring-white/20 cursor-move touch-action-none ${
                snapping ? "transition-all duration-200 ease-out" : ""
              }`}
              style={{
                left: pos.x,
                top: pos.y,
              }}
            />
          )}
        </div>

        {/* CONTROLS */}
        <div className="px-6 pb-10">
          <div className="mx-auto flex max-w-md items-center justify-center gap-4">
            <button
              onClick={toggleMute}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10"
            >
              {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            <button
              onClick={toggleCamera}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10"
            >
              {isCameraOff ? <VideoOff size={22} /> : <Video size={22} />}
            </button>

            <button
              onClick={toggleSpeaker}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10"
            >
              {speakerOn ? <Volume2 size={22} /> : <VolumeX size={22} />}
            </button>

            <button
              onClick={handleEndCall}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600"
            >
              <PhoneOff size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
