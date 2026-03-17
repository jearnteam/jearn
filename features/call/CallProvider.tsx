"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChatSocket } from "@/features/chat/ChatSocketProvider";

type CallMode = "audio" | "video";
type CallStatus = "idle" | "incoming" | "outgoing" | "connecting" | "in-call";

type IncomingCall = {
  callId: string;
  fromUserId: string;
  roomName: string;
  mode: CallMode;
};

type ActiveCall = {
  callId: string;
  peerUserId: string;
  roomName: string;
  mode: CallMode;
  isCaller: boolean;
};

type CallContextValue = {
  callStatus: CallStatus;
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;

  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  isMuted: boolean;
  isCameraOff: boolean;
  speakerOn: boolean;

  startOutgoingCall: (opts: {
    callId: string;
    peerUserId: string;
    roomName: string;
    mode: CallMode;
  }) => void;
  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => void;
  endCall: () => void;

  toggleMute: () => void;
  toggleCamera: () => Promise<void>;
  toggleSpeaker: () => void;

  startOutgoingNegotiation: (opts: {
    callId: string;
    peerUserId: string;
    roomName: string;
    mode: CallMode;
  }) => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { currentUserId, send, subscribeSignal } = useChatSocket();

  const [callStatus, setCallStatus] = useState<CallStatus>("idle");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const ringTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ringingAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);

  const activeCallRef = useRef<ActiveCall | null>(null);
  const incomingCallRef = useRef<IncomingCall | null>(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  const stopRingtone = useCallback(() => {
    const audio = ringingAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  }, []);

  const cleanup = useCallback(() => {
    stopRingtone();

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop();
      }
    }

    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }

    localStreamRef.current = null;
    remoteStreamRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIncomingCall(null);
    setActiveCall(null);
    setCallStatus("idle");
    setIsMuted(false);
    setIsCameraOff(false);
    setSpeakerOn(true);
    pendingIceRef.current = [];
  }, [stopRingtone]);

  // --- CORE WEBRTC SETUP ---

  const createPeerConnection = useCallback(
    (callId: string, peerUserId: string) => {
      const pc = new RTCPeerConnection(RTC_CONFIG);

      // 🔥 THE FIX: Pre-allocate transceivers for both audio and video immediately.
      // This ensures that even if you start an audio call, a video pipe exists to be toggled on later.
      pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.addTransceiver("video", { direction: "sendrecv" });

      pc.ontrack = (event) => {
        // Safely assign incoming remote tracks
        const stream =
          event.streams && event.streams[0]
            ? event.streams[0]
            : new MediaStream([event.track]);
        remoteStreamRef.current = stream;
        setRemoteStream(new MediaStream(stream.getTracks())); // Trigger UI re-render
      };

      pc.onicecandidate = (event) => {
        if (!event.candidate) return;
        send({
          type: "call:ice",
          callId,
          targetUserId: peerUserId,
          fromUserId: currentUserId,
          candidate: event.candidate.toJSON(),
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setCallStatus("in-call");
        if (
          pc.connectionState === "failed" ||
          pc.connectionState === "closed" ||
          pc.connectionState === "disconnected"
        ) {
          cleanup();
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [cleanup, currentUserId, send]
  );

  const attachLocalTracks = useCallback(
    (pc: RTCPeerConnection, stream: MediaStream) => {
      const transceivers = pc.getTransceivers();
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];

      // Map tracks to our pre-allocated transceivers
      const audioTransceiver = transceivers.find(
        (t) => t.receiver.track?.kind === "audio"
      );
      const videoTransceiver = transceivers.find(
        (t) => t.receiver.track?.kind === "video"
      );

      if (audioTransceiver && audioTrack)
        audioTransceiver.sender.replaceTrack(audioTrack);
      if (videoTransceiver && videoTrack)
        videoTransceiver.sender.replaceTrack(videoTrack);
    },
    []
  );

  const getUserMediaSafe = useCallback(async (mode: CallMode) => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video",
      });
      return { stream, mode };
    } catch (err) {
      console.warn("Video failed → switching to audio", err);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      return { stream, mode: "audio" as CallMode };
    }
  }, []);

  const flushPendingIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) return;
    const queue = [...pendingIceRef.current];
    pendingIceRef.current = [];
    for (const candidate of queue) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error("ICE add failed:", err);
      }
    }
  }, []);

  // --- CALL ACTIONS ---

  const startOutgoingCall = useCallback(
    ({
      callId,
      peerUserId,
      roomName,
      mode,
    }: {
      callId: string;
      peerUserId: string;
      roomName: string;
      mode: CallMode;
    }) => {
      setCallStatus("outgoing");
      setActiveCall({ callId, peerUserId, roomName, mode, isCaller: true });

      ringTimeoutRef.current = setTimeout(async () => {
        send({ type: "call:end", callId, targetUserId: peerUserId });
        cleanup();
      }, 20000);
    },
    [cleanup, send]
  );

  const startOutgoingNegotiation = useCallback(
    async ({
      callId,
      peerUserId,
      roomName,
      mode,
    }: {
      callId: string;
      peerUserId: string;
      roomName: string;
      mode: CallMode;
    }) => {
      try {
        setCallStatus((prev) => (prev === "connecting" ? prev : "connecting"));

        const { stream, mode: finalMode } = await getUserMediaSafe(mode);
        localStreamRef.current = stream;
        setLocalStream(stream);

        const pc = createPeerConnection(callId, peerUserId);
        attachLocalTracks(pc, stream);

        setActiveCall({
          callId,
          peerUserId,
          roomName,
          mode: finalMode,
          isCaller: true,
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        send({
          type: "call:offer",
          callId,
          targetUserId: peerUserId,
          fromUserId: currentUserId,
          offer,
        });
      } catch (err) {
        cleanup();
      }
    },
    [
      attachLocalTracks,
      cleanup,
      createPeerConnection,
      currentUserId,
      getUserMediaSafe,
      send,
    ]
  );

  const acceptIncomingCall = useCallback(async () => {
    const targetCall = incomingCallRef.current || incomingCall;
    if (!targetCall) return;

    try {
      stopRingtone();
      await fetch("/api/calls/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: targetCall.callId }),
      });

      const { stream, mode: finalMode } = await getUserMediaSafe(
        targetCall.mode
      );
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = createPeerConnection(targetCall.callId, targetCall.fromUserId);
      attachLocalTracks(pc, stream);

      setActiveCall({
        callId: targetCall.callId,
        peerUserId: targetCall.fromUserId,
        roomName: targetCall.roomName,
        mode: finalMode,
        isCaller: false,
      });
      setCallStatus("connecting");

      send({
        type: "call:accept",
        callId: targetCall.callId,
        fromUserId: targetCall.fromUserId,
        roomName: targetCall.roomName,
      });
      setIncomingCall(null);
    } catch (err) {
      cleanup();
    }
  }, [
    incomingCall,
    stopRingtone,
    getUserMediaSafe,
    createPeerConnection,
    attachLocalTracks,
    send,
    cleanup,
  ]);

  const rejectIncomingCall = useCallback(() => {
    const targetCall = incomingCallRef.current || incomingCall;
    if (!targetCall) return;
    send({
      type: "call:reject",
      callId: targetCall.callId,
      fromUserId: targetCall.fromUserId,
    });
    stopRingtone();
    setIncomingCall(null);
    setCallStatus("idle");
  }, [incomingCall, send, stopRingtone]);

  const endCall = useCallback(() => {
    const targetCall = activeCallRef.current || activeCall;
    if (targetCall) {
      send({
        type: "call:end",
        callId: targetCall.callId,
        targetUserId: targetCall.peerUserId,
      });
    }
    cleanup();
  }, [activeCall, cleanup, send]);

  // --- DEVICE TOGGLES ---

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (localStreamRef.current) {
        for (const track of localStreamRef.current.getAudioTracks())
          track.enabled = !next;
      }
      return next;
    });
  }, []);

  const toggleCamera = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc) return;

    // Grab the video transceiver we created at the very beginning of the call
    const videoTransceiver = pc
      .getTransceivers()
      .find((t) => t.receiver.track?.kind === "video");
    const videoSender = videoTransceiver?.sender;

    if (!videoSender) return;

    if (!isCameraOff) {
      // TURN OFF
      const videoTrack = localStreamRef.current?.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = false;
        videoTrack.stop();
        localStreamRef.current?.removeTrack(videoTrack);
      }
      await videoSender.replaceTrack(null);
      setIsCameraOff(true);
      setLocalStream(
        new MediaStream(localStreamRef.current?.getTracks() || [])
      );
    } else {
      // TURN ON
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const track = stream.getVideoTracks()[0];

        if (!localStreamRef.current) localStreamRef.current = new MediaStream();

        localStreamRef.current.addTrack(track);
        await videoSender.replaceTrack(track); // Instantly flows to the other side via the pre-allocated pipe!

        setIsCameraOff(false);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      } catch (err) {
        console.error("Failed to enable camera", err);
      }
    }
  }, [isCameraOff]);

  const toggleSpeaker = useCallback(() => setSpeakerOn((prev) => !prev), []);

  // --- SOCKET LISTENER ---

  useEffect(() => {
    const unsub = subscribeSignal(async (data) => {
      if (!data?.type) return;

      const currentActiveCall = activeCallRef.current;
      const currentIncomingCall = incomingCallRef.current;

      if (data.callId) {
        const id = currentActiveCall?.callId ?? currentIncomingCall?.callId;
        if (id && data.callId !== id) return;
      }

      if (data.type === "call:incoming") {
        setIncomingCall((prev) => {
          if (prev?.callId === data.callId) return prev;
          return {
            callId: data.callId,
            fromUserId: data.fromUserId,
            roomName: data.roomName,
            mode: data.mode ?? "audio",
          };
        });
        setCallStatus((prev) => (prev === "incoming" ? prev : "incoming"));

        try {
          if (!ringingAudioRef.current) {
            ringingAudioRef.current = new Audio("/sounds/incoming-call.mp3");
            ringingAudioRef.current.loop = true;
          }
          ringingAudioRef.current.play().catch(() => {});
        } catch {}
        return;
      }

      if (data.type === "call:accepted") {
        if (!currentActiveCall) return;
        if (ringTimeoutRef.current) {
          clearTimeout(ringTimeoutRef.current);
          ringTimeoutRef.current = null;
        }
        if (currentActiveCall.isCaller) {
          await startOutgoingNegotiation({
            callId: currentActiveCall.callId,
            peerUserId: currentActiveCall.peerUserId,
            roomName: currentActiveCall.roomName,
            mode: currentActiveCall.mode,
          });
        }
        return;
      }

      if (data.type === "call:rejected" || data.type === "call:ended") {
        cleanup();
        return;
      }

      if (data.type === "call:offer") {
        // 🔥 FIX: Explicitly map fromUserId to peerUserId so it matches the ActiveCall shape
        const targetCall =
          currentActiveCall ??
          (currentIncomingCall
            ? {
                callId: currentIncomingCall.callId,
                peerUserId: currentIncomingCall.fromUserId,
                roomName: currentIncomingCall.roomName,
                mode: currentIncomingCall.mode,
                isCaller: false as const,
              }
            : null);

        if (!targetCall) return;

        let pc = pcRef.current;
        if (!pc)
          pc = createPeerConnection(targetCall.callId, targetCall.peerUserId);

        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

          let stream = localStreamRef.current;
          if (!stream) {
            const media = await getUserMediaSafe(targetCall.mode);
            stream = media.stream;
            localStreamRef.current = stream;
            setLocalStream(stream);
          }

          attachLocalTracks(pc, stream);
          await flushPendingIce();

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          send({
            type: "call:answer",
            callId: targetCall.callId,
            targetUserId: targetCall.peerUserId,
            fromUserId: currentUserId,
            answer,
          });
        } catch (err) {
          cleanup();
        }
        return;
      }

      if (data.type === "call:answer") {
        const pc = pcRef.current;
        if (!pc || !currentActiveCall) return;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          await flushPendingIce();
        } catch (err) {
          cleanup();
        }
        return;
      }

      if (data.type === "call:ice") {
        const pc = pcRef.current;
        if (!pc) return;
        if (!pc.remoteDescription) {
          pendingIceRef.current.push(data.candidate);
          return;
        }
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (err) {}
      }
    });

    return unsub;
  }, [
    subscribeSignal,
    startOutgoingNegotiation,
    cleanup,
    createPeerConnection,
    attachLocalTracks,
    flushPendingIce,
    getUserMediaSafe,
    send,
    currentUserId,
  ]);

  const value = useMemo<CallContextValue>(
    () => ({
      callStatus,
      incomingCall,
      activeCall,
      localStream,
      remoteStream,
      isMuted,
      isCameraOff,
      speakerOn,
      startOutgoingCall,
      acceptIncomingCall,
      rejectIncomingCall,
      endCall,
      toggleMute,
      toggleCamera,
      toggleSpeaker,
      startOutgoingNegotiation,
    }),
    [
      callStatus,
      incomingCall,
      activeCall,
      localStream,
      remoteStream,
      isMuted,
      isCameraOff,
      speakerOn,
      startOutgoingCall,
      acceptIncomingCall,
      rejectIncomingCall,
      endCall,
      toggleMute,
      toggleCamera,
      toggleSpeaker,
      startOutgoingNegotiation,
    ]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside CallProvider");
  return ctx;
}
