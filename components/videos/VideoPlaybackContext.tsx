"use client";

import { createContext, useContext, useEffect, useRef } from "react";

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

  const enabledRef = useRef(true);

  useEffect(() => {
    const enable = () => (enabledRef.current = true);
    const disable = () => (enabledRef.current = false);

    window.addEventListener("videos:enable", enable);
    window.addEventListener("videos:disable", disable);

    return () => {
      window.removeEventListener("videos:enable", enable);
      window.removeEventListener("videos:disable", disable);
    };
  }, []);

  function setActive(id: string, video: HTMLVideoElement) {
    if (!enabledRef.current) return;

    if (activeVideoRef.current?.id === id) return;

    if (activeVideoRef.current) {
      activeVideoRef.current.video.pause();
    }

    activeVideoRef.current = { id, video };
    video.play().catch(() => {});
  }

  function clearActive(id: string) {
    if (activeVideoRef.current?.id === id) {
      activeVideoRef.current.video.pause();
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
  if (!ctx) throw new Error("useVideoPlayback must be used inside provider");
  return ctx;
}
