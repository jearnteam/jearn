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
    minimized,
    setMinimized,
    endCall,
    toggleMute,
    toggleCamera,
    switchCamera,
  } = useCall();

  const localMainRef = useRef<HTMLVideoElement | null>(null);
  const remoteMainRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const localPipRef = useRef<HTMLVideoElement | null>(null);
  const remotePipRef = useRef<HTMLVideoElement | null>(null);

  const [mainView, setMainView] = useState<"local" | "remote">("remote");

  const isActiveCall = callStatus === "connecting" || callStatus === "in-call";

  /* ===== Streams ===== */
  const participant = useMemo(() => {
    const entries = Object.entries(remoteStreams);
    return entries.length > 0 ? entries[0] : null;
  }, [remoteStreams]);

  const remoteStream = participant?.[1] ?? null;
  const remoteUserId = participant?.[0] ?? "";

  /* ===== Track state ===== */
  const hasLocalVideo = !!localStream
    ?.getVideoTracks()
    .some((t) => t.readyState === "live");

  const hasRemoteVideo = !!remoteStream
    ?.getVideoTracks()
    .some((t) => t.readyState === "live");

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

  const isMainVideoAvailable =
    effectiveMain === "local" ? hasLocalVideo : hasRemoteVideo;

  const isAudioOnly = !isMainVideoAvailable;

  const pipView = useMemo(() => {
    if (effectiveMain === "local" && hasRemoteVideo) return "remote";
    if (effectiveMain === "remote" && hasLocalVideo) return "local";
    return null;
  }, [effectiveMain, hasLocalVideo, hasRemoteVideo]);

  const canSwitch = hasLocalVideo && hasRemoteVideo;

  const swapMain = () => {
    if (!canSwitch) return;
    setMainView((p) => (p === "local" ? "remote" : "local"));
  };

  /* ===== STREAM ATTACH ===== */
  useEffect(() => {
    const attach = (
      el: HTMLMediaElement | null,
      stream: MediaStream | null,
      muted = false
    ) => {
      if (!el) return;
      if (el.srcObject !== stream) el.srcObject = stream;
      el.muted = muted;
      el.autoplay = true;
      el.play().catch(() => {});
    };

    const detach = (el: HTMLMediaElement | null) => {
      if (!el) return;
      if (el.srcObject) el.srcObject = null;
    };

    if (effectiveMain === "local") {
      attach(localMainRef.current, localStream, true);
      detach(localPipRef.current);
    } else {
      attach(localPipRef.current, localStream, true);
      detach(localMainRef.current);
    }

    if (effectiveMain === "remote") {
      attach(remoteMainRef.current, remoteStream, false);
      detach(remotePipRef.current);
    } else {
      attach(remotePipRef.current, remoteStream, false);
      detach(remoteMainRef.current);
    }

    attach(remoteAudioRef.current, remoteStream, false);
  }, [localStream, remoteStream, effectiveMain]);

  useEffect(() => {
    if (minimized) {
      localMainRef.current?.pause?.();
      remoteMainRef.current?.pause?.();
    }
  }, [minimized]);

  useEffect(() => {
    if (callStatus === "connecting" || callStatus === "in-call") {
      setMinimized(false);
    }
  }, [callStatus]);

  if (!(callStatus === "connecting" || callStatus === "in-call")) return null;
  if (!isActiveCall || minimized) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-black text-white">
      {/* CLICK LAYER */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        onClick={() => {
          if (!canSwitch) return;
          swapMain();
        }}
      />

      {/* MINIMIZE BUTTON */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMinimized(true);
        }}
        className="
          absolute top-4 right-4 z-50
          h-10 w-10
          rounded-full
          bg-black/40 backdrop-blur
          flex items-center justify-center
        "
      >
        —
      </button>

      {/* MAIN */}
      <div className="absolute inset-0">
        <audio ref={remoteAudioRef} />

        {isAudioOnly ? (
          <VoiceCallUI
            name={activeCall?.peerUserName}
            status={callStatus === "connecting" ? "Connecting..." : "In call"}
            userId={remoteUserId || activeCall?.peerUserId}
          />
        ) : (
          <>
            {/* LOCAL */}
            <video
              ref={localMainRef}
              className={`absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none ${
                effectiveMain === "local" && hasLocalVideo
                  ? "z-10 opacity-100"
                  : "opacity-0"
              }`}
            />

            {/* REMOTE */}
            <video
              ref={remoteMainRef}
              muted
              className={`absolute inset-0 w-full h-full object-cover pointer-events-none ${
                effectiveMain === "remote" && hasRemoteVideo
                  ? "z-10 opacity-100"
                  : "opacity-0"
              }`}
            />

            {/* LOCAL AVATAR */}
            {!hasLocalVideo && effectiveMain === "local" && (
              <div className="absolute inset-0 z-20">
                <Avatar userId={currentUserFallback()} />
              </div>
            )}

            {/* REMOTE AVATAR */}
            {!hasRemoteVideo && effectiveMain === "remote" && (
              <div className="absolute inset-0 z-20">
                <Avatar userId={remoteUserId} />
              </div>
            )}
          </>
        )}
      </div>

      {/* PiP */}
      {pipView && !isAudioOnly && (
        <div className="absolute z-30 h-44 w-32 rounded-xl overflow-hidden border border-white/10">
          {pipView === "local" ? (
            <video
              ref={localPipRef}
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
          ) : (
            <video
              ref={remotePipRef}
              muted
              className="w-full h-full object-cover"
            />
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

/* ===== UI ===== */

function VoiceCallUI({
  name,
  status,
  userId,
}: {
  name?: string;
  status: string;
  userId?: string;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-green-400/20 animate-ping" />
        <div className="relative z-10 w-28 h-28 rounded-full overflow-hidden bg-zinc-700">
          <img
            src={avatarUrl(userId || "")}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <h2 className="text-xl font-semibold">{name || "User"}</h2>
      <p className="text-zinc-400 mt-2 text-sm">{status}</p>
    </div>
  );
}

function Avatar({ userId }: { userId?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <div className="h-20 w-20 rounded-full overflow-hidden bg-zinc-700 ring-2 ring-white/20">
        <img
          src={avatarUrl(userId || "")}
          className="w-full h-full object-cover"
        />
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

/* ===== helper ===== */
function currentUserFallback() {
  return ""; // replace if you want your own avatar id
}
