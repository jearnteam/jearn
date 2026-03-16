"use client";

import { useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  Track,
  createLocalTracks,
} from "livekit-client";

type ConnectParams = {
  url: string;
  token: string;
  audioOnly?: boolean;
};

export function useLiveKitRoom() {
  const roomRef = useRef<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);

  async function connect({ url, token, audioOnly = true }: ConnectParams) {
    const room = new Room();
    roomRef.current = room;

    room.on(RoomEvent.Connected, () => {
      setConnected(true);
      setParticipants(Array.from(room.remoteParticipants.values()));
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      setParticipants(Array.from(room.remoteParticipants.values()));
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      setParticipants(Array.from(room.remoteParticipants.values()));
    });

    room.on(RoomEvent.Disconnected, () => {
      setConnected(false);
      setParticipants([]);
    });

    await room.connect(url, token);

    const localTracks = await createLocalTracks({
      audio: true,
      video: !audioOnly,
    });

    for (const track of localTracks) {
      await room.localParticipant.publishTrack(track);
    }
  }

  async function disconnect() {
    const room = roomRef.current;
    if (!room) return;
    room.disconnect();
    roomRef.current = null;
    setConnected(false);
    setParticipants([]);
  }

  async function setMicEnabled(enabled: boolean) {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setMicrophoneEnabled(enabled);
  }

  async function setCameraEnabled(enabled: boolean) {
    const room = roomRef.current;
    if (!room) return;
    await room.localParticipant.setCameraEnabled(enabled);
  }

  return {
    roomRef,
    connected,
    participants,
    connect,
    disconnect,
    setMicEnabled,
    setCameraEnabled,
  };
}