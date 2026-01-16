"use client";

import { createContext, useContext, useRef } from "react";

type PlaybackContextType = {
  setActive: (id: string, video: HTMLVideoElement) => void;
  clearActive: (id: string) => void;
};

const PlaybackContext = createContext<PlaybackContextType | null>(null);

export function VideoPlaybackProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const activeVideoRef = useRef<{
    id: string;
    video: HTMLVideoElement;
  } | null>(null);

  function setActive(id: string, video: HTMLVideoElement) {
    if (activeVideoRef.current?.id === id) return;

    // pause previous
    if (activeVideoRef.current) {
      activeVideoRef.current.video.pause();
    }

    activeVideoRef.current = { id, video };
    video.play().catch(() => {});
  }

  function clearActive(id: string) {
    if (activeVideoRef.current?.id === id) {
      activeVideoRef.current = null;
    }
  }

  return (
    <PlaybackContext.Provider value={{ setActive, clearActive }}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function useVideoPlayback() {
  const ctx = useContext(PlaybackContext);
  if (!ctx) {
    throw new Error(
      "useVideoPlayback must be used inside VideoPlaybackProvider"
    );
  }
  return ctx;
}
