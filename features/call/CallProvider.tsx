"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { useChatSocket } from "@/features/chat/ChatSocketProvider";

/* ================= TYPES ================= */

type CallMode = "audio" | "video";

type IncomingCall = {
  callId: string;
  fromUserId: string;
  fromUserName: string;
  mode: CallMode;
};

type ActiveCall = {
  callId: string;
  peerUserId: string;
  peerUserName: string;
  mode: CallMode;
  isCaller: boolean;
};

type CallContextValue = {
  incomingCall: IncomingCall | null;
  activeCall: ActiveCall | null;

  localStream: MediaStream | null;
  remoteStreams: Record<string, MediaStream>;

  callStatus: "idle" | "calling" | "incoming" | "connecting" | "in-call";

  startCall: (opts: {
    callId: string;
    peerUserId: string;
    peerUserName: string;
    mode: CallMode;
  }) => void;

  minimized,
  setMinimized,

  acceptIncomingCall: () => Promise<void>;
  rejectIncomingCall: () => void;
  endCall: () => void;

  toggleMute: () => void;
  toggleCamera: () => Promise<void>;
  switchCamera: () => Promise<void>;
};

const CallContext = createContext<CallContextValue | null>(null);

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.cloudflare.com:3478" }],
  bundlePolicy: "max-bundle",
};

async function sfuRequest(path: string, body: any) {
  const res = await fetch(`/api/realtime/${path}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error("SFU ERROR:", path, data);
    throw new Error(data?.error || "SFU request failed");
  }

  return data;
}

export function CallProvider({ children }: { children: React.ReactNode }) {
  const { send, currentUserId, currentUserName, subscribeSignal } = useChatSocket();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallRef = useRef<ActiveCall | null>(null);
  const pendingRemoteReadyRef = useRef<any[]>([]);
  const facingModeRef = useRef<"user" | "environment">("user");
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<
    Record<string, MediaStream>
  >({});
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>(null);
  const [callStatus, setCallStatus] = useState<
    "idle" | "calling" | "incoming" | "connecting" | "in-call"
  >("idle");
  const [minimized, setMinimized] = useState(false);

  const syncLocalStream = (stream: MediaStream | null) => {
    localStreamRef.current = stream;
    if (!stream) {
      setLocalStream(null);
      return;
    }
    setLocalStream(new MediaStream(stream.getTracks()));
  };

  const createPC = () => {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    const rebuildRemoteStream = (
      key: string,
      updater: (tracks: MediaStreamTrack[]) => MediaStreamTrack[]
    ) => {
      setRemoteStreams((prev) => {
        const existing = prev[key] ?? new MediaStream();
        const nextTracks = updater(existing.getTracks());

        return {
          ...prev,
          [key]: new MediaStream(nextTracks),
        };
      });
    };

    pc.ontrack = (event) => {
      const key = activeCallRef.current?.peerUserId ?? "remote";
      const track = event.track;

      console.log("REMOTE TRACK RECEIVED:", track.kind, track.id, {
        muted: track.muted,
        enabled: track.enabled,
        readyState: track.readyState,
      });

      rebuildRemoteStream(key, (tracks) => {
        const withoutSameKindEnded = tracks.filter(
          (t) => !(t.kind === track.kind && t.readyState === "ended")
        );

        const alreadyExists = withoutSameKindEnded.some(
          (t) => t.id === track.id
        );
        if (alreadyExists) return withoutSameKindEnded;

        return [...withoutSameKindEnded, track];
      });

      track.onunmute = () => {
        console.log("TRACK UNMUTED:", track.kind, track.id);

        rebuildRemoteStream(key, (tracks) => {
          const others = tracks.filter((t) => t.id !== track.id);
          return [...others, track];
        });
      };

      track.onmute = () => {
        console.log("TRACK MUTED:", track.kind, track.id);

        rebuildRemoteStream(key, (tracks) => {
          const others = tracks.filter((t) => t.id !== track.id);
          return [...others, track];
        });
      };

      track.onended = () => {
        console.log("TRACK ENDED:", track.kind, track.id);

        rebuildRemoteStream(key, (tracks) =>
          tracks.filter((t) => t.id !== track.id)
        );
      };
    };

    pcRef.current = pc;
    return pc;
  };

  const cleanup = () => {
    pcRef.current?.close();
    pcRef.current = null;
    sessionIdRef.current = null;
    pendingRemoteReadyRef.current = [];

    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;

    setLocalStream(null);
    setRemoteStreams({});
    setIncomingCall(null);
    setActiveCall(null);
    setCallStatus("idle");
  };

  const startCall = ({
    callId,
    peerUserId,
    peerUserName,
    mode,
  }: {
    callId: string;
    peerUserId: string;
    peerUserName: string;
    mode: CallMode;
  }) => {
    if (!peerUserId || peerUserId === currentUserId) {
      console.error("Refusing to start call: invalid peerUserId");
      return;
    }

    setActiveCall({
      callId,
      peerUserId,
      peerUserName,
      mode,
      isCaller: true,
    });

    setCallStatus("calling");

    send({
      type: "call:start",
      callId,
      targetUserId: peerUserId,
      fromUserId: currentUserId,
      fromUserName: currentUserName,
      mode,
    });
  };

  const waitICE = (pc: RTCPeerConnection) =>
    new Promise<void>((resolve) => {
      if (pc.iceGatheringState === "complete") return resolve();

      const check = () => {
        if (pc.iceGatheringState === "complete") {
          pc.removeEventListener("icegatheringstatechange", check);
          resolve();
        }
      };

      pc.addEventListener("icegatheringstatechange", check);
    });

  const subscribeToPeerTracks = async (msg: any) => {
    const pc = pcRef.current;
    const sessionId = sessionIdRef.current;

    if (!pc || !sessionId) {
      pendingRemoteReadyRef.current.push(msg);
      return;
    }

    if (!msg.tracks || msg.tracks.length === 0) {
      console.warn("No tracks received from peer");
      return;
    }

    const remoteTracks = msg.tracks.map((t: any) => ({
      location: "remote",
      sessionId: msg.sessionId,
      trackName: t.trackName,
    }));

    const sub = await sfuRequest("tracks", {
      sessionId,
      tracks: remoteTracks,
    });

    if (sub.requiresImmediateRenegotiation && sub.sessionDescription) {
      await pc.setRemoteDescription(sub.sessionDescription);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitICE(pc);

      await sfuRequest("renegotiate", {
        sessionId,
        sessionDescription: {
          type: "answer",
          sdp: pc.localDescription?.sdp,
        },
      });
    }
  };

  const flushPendingRemoteReady = async () => {
    const queue = [...pendingRemoteReadyRef.current];
    pendingRemoteReadyRef.current = [];

    for (const msg of queue) {
      await subscribeToPeerTracks(msg);
    }
  };

  const getCallMedia = async (mode: CallMode) => {
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === "video",
      });
    } catch (err) {
      console.warn("Video failed, fallback to audio:", err);

      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
      } catch {
        return new MediaStream();
      }
    }
  };

  const setupLocalTransceivers = async (
    pc: RTCPeerConnection,
    stream: MediaStream
  ) => {
    const audioTx = pc.addTransceiver("audio", {
      direction: stream.getAudioTracks().length ? "sendrecv" : "recvonly",
    });

    const videoTx = pc.addTransceiver("video", {
      direction: "sendrecv", // ALWAYS
    });

    const audioTrack = stream.getAudioTracks()[0] ?? null;
    const videoTrack = stream.getVideoTracks()[0] ?? null;

    if (audioTrack) {
      await audioTx.sender.replaceTrack(audioTrack);
    }

    if (videoTrack) {
      await videoTx.sender.replaceTrack(videoTrack);
    }

    return { audioTx, videoTx };
  };

  const publishLocalTracks = async (
    pc: RTCPeerConnection,
    sessionId: string,
    peerUserId: string
  ) => {
    const trackObjects = pc
      .getTransceivers()
      .filter((t) => t.sender.track && t.mid)
      .map((t) => ({
        location: "local",
        mid: t.mid!,
        trackName: `${currentUserId}_${t.sender.track!.id}`,
      }));

    if (trackObjects.length > 0) {
      const pub = await sfuRequest("tracks", {
        sessionId,
        tracks: trackObjects,
      });

      if (pub.sessionDescription && pc.signalingState !== "stable") {
        await pc.setRemoteDescription(pub.sessionDescription);
      }
    }

    send({
      type: "call:sfu-ready",
      targetUserId: peerUserId,
      fromUserId: currentUserId,
      sessionId,
      tracks: trackObjects,
    });
  };

  const startSFU = async (call: ActiveCall) => {
    setCallStatus("connecting");

    const pc = createPC();
    const stream = await getCallMedia(call.mode);

    syncLocalStream(stream);

    await setupLocalTransceivers(pc, stream);

    await pc.setLocalDescription(await pc.createOffer());
    await waitICE(pc);

    const session = await sfuRequest("session", {
      sessionDescription: {
        type: "offer",
        sdp: pc.localDescription!.sdp,
      },
    });

    sessionIdRef.current = session.sessionId;

    await pc.setRemoteDescription(session.sessionDescription);
    await flushPendingRemoteReady();
    await publishLocalTracks(pc, session.sessionId, call.peerUserId);

    setCallStatus("in-call");
  };

  const joinCall = async (call: ActiveCall) => {
    setCallStatus("connecting");

    const pc = createPC();
    const stream = await getCallMedia(call.mode);

    syncLocalStream(stream);

    await setupLocalTransceivers(pc, stream);

    await pc.setLocalDescription(await pc.createOffer());
    await waitICE(pc);

    const session = await sfuRequest("session", {
      sessionDescription: {
        type: "offer",
        sdp: pc.localDescription!.sdp,
      },
    });

    sessionIdRef.current = session.sessionId;

    await pc.setRemoteDescription(session.sessionDescription);
    await flushPendingRemoteReady();
    await publishLocalTracks(pc, session.sessionId, call.peerUserId);

    setCallStatus("in-call");
  };

  const acceptIncomingCall = async () => {
    if (!incomingCall) return;

    const acceptedCall: ActiveCall = {
      callId: incomingCall.callId,
      peerUserId: incomingCall.fromUserId,
      peerUserName: incomingCall.fromUserName,
      mode: incomingCall.mode,
      isCaller: false,
    };

    setActiveCall(acceptedCall);
    setIncomingCall(null);
    setCallStatus("connecting");

    send({
      type: "call:accept",
      callId: acceptedCall.callId,
      targetUserId: acceptedCall.peerUserId,
    });

    try {
      await joinCall(acceptedCall);
    } catch (err) {
      console.error("joinCall failed:", err);

      send({
        type: "call:end",
        callId: acceptedCall.callId,
        targetUserId: acceptedCall.peerUserId,
      });

      cleanup();
    }
  };

  const rejectIncomingCall = () => {
    if (!incomingCall) return;

    send({
      type: "call:reject",
      callId: incomingCall.callId,
      targetUserId: incomingCall.fromUserId,
    });

    setIncomingCall(null);
    setCallStatus("idle");
  };

  const endCall = () => {
    if (activeCallRef.current) {
      send({
        type: "call:end",
        callId: activeCallRef.current.callId,
        targetUserId: activeCallRef.current.peerUserId,
      });
    }

    cleanup();
  };

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;

    stream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });

    syncLocalStream(stream);
  };

  const toggleCamera = async () => {
    const pc = pcRef.current;
    const sessionId = sessionIdRef.current;
    const activeCall = activeCallRef.current;
    if (!pc || !sessionId || !activeCall) return;
    const videoTx = pc
      .getTransceivers()
      .find((t) => t.receiver.track.kind === "video");
    if (!videoTx) {
      console.warn("No video transceiver");
      return;
    }
    const sender = videoTx.sender;
    let stream = localStreamRef.current;
    if (!stream) {
      stream = new MediaStream();
      localStreamRef.current = stream;
    }
    const existingTrack = sender.track; // turn off
    if (existingTrack && existingTrack.readyState === "live") {
      existingTrack.enabled = !existingTrack.enabled;
      stream.getVideoTracks().forEach((t) => {
        if (t.id === existingTrack.id) {
          t.enabled = existingTrack.enabled;
        }
      });
      syncLocalStream(stream);
      return;
    }
    // turn on
    const camStream = await navigator.mediaDevices.getUserMedia({
      video: true,
    });
    const newTrack = camStream.getVideoTracks()[0];
    await sender.replaceTrack(newTrack);
    stream.getVideoTracks().forEach((t) => stream!.removeTrack(t));
    stream.addTrack(newTrack);
    syncLocalStream(stream);
    await publishLocalTracks(pc, sessionId, activeCall.peerUserId);
  };

  const switchCamera = async () => {
    const pc = pcRef.current;
    const stream = localStreamRef.current;

    if (!pc || !stream) return;

    const sender = pc.getSenders().find((s) => s.track?.kind === "video");

    const newFacing = facingModeRef.current === "user" ? "environment" : "user";

    facingModeRef.current = newFacing;

    const camStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: newFacing },
    });

    const newTrack = camStream.getVideoTracks()[0];

    if (sender) {
      await sender.replaceTrack(newTrack);
    }

    // replace in local stream
    stream.getVideoTracks().forEach((t) => {
      t.stop();
      stream.removeTrack(t);
    });

    stream.addTrack(newTrack);

    syncLocalStream(stream);
  };

  React.useEffect(() => {
    return subscribeSignal(async (msg) => {
      if (msg.type === "call:start") {
        if (msg.fromUserId === currentUserId) return;

        setIncomingCall({
          callId: msg.callId,
          fromUserId: msg.fromUserId,
          fromUserName: msg.fromUserName ?? "Unknown",
          mode: msg.mode,
        });

        setCallStatus("incoming");
        return;
      }

      if (msg.type === "call:accept") {
        if (activeCallRef.current?.isCaller) {
          try {
            await startSFU(activeCallRef.current);
          } catch (err) {
            console.error("startSFU failed:", err);

            send({
              type: "call:end",
              callId: activeCallRef.current.callId,
              targetUserId: activeCallRef.current.peerUserId,
            });

            cleanup();
          }
        }
        return;
      }

      if (msg.type === "call:sfu-ready") {
        await subscribeToPeerTracks(msg);
        return;
      }

      if (msg.type === "call:end" || msg.type === "call:reject") {
        cleanup();
      }
    });
  }, [subscribeSignal, currentUserId, send]);

  React.useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  const value = useMemo(
    () => ({
      incomingCall,
      activeCall,
      localStream,
      remoteStreams,
      callStatus,
      minimized,
      setMinimized,
      startCall,
      acceptIncomingCall,
      rejectIncomingCall,
      endCall,
      toggleCamera,
      toggleMute,
      switchCamera,
    }),
    [incomingCall, activeCall, localStream, remoteStreams, callStatus, minimized]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error("useCall must be used inside CallProvider");
  return ctx;
}
