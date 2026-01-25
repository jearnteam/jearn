"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import type { Post } from "@/types/post";

/* ---------------------------------------------
 * TYPES
 * ------------------------------------------- */
type SavedVideoState = {
  videoId: string | null;
  time: number;
  paused: boolean;
  scrollTop: number;
};

type VideoSettingsContextType = {
  /* 🔊 Audio */
  muted: boolean;
  toggleMute: () => void;
  setMuted: (v: boolean) => void;

  /* 🎬 Playback state */
  savedState: SavedVideoState;
  saveVideoState: (v: Partial<SavedVideoState>) => void;

  /* 📦 Video list (in-memory, survives tab switch) */
  videos: Post[];
  setVideos: (v: Post[]) => void;
};

const VideoSettingsContext =
  createContext<VideoSettingsContextType | null>(null);

/* ---------------------------------------------
 * STORAGE KEYS
 * ------------------------------------------- */
const STORAGE_KEY = "video-muted";
const VIDEO_STATE_KEY = "video-playback-state";

/* ---------------------------------------------
 * PROVIDER
 * ------------------------------------------- */
export function VideoSettingsProvider({ children }: { children: ReactNode }) {
  /* 🔊 Muted */
  const [muted, setMutedState] = useState(true);

  /* 🎬 Playback */
  const [savedState, setSavedState] = useState<SavedVideoState>({
    videoId: null,
    time: 0,
    paused: true,
    scrollTop: 0,
  });

  /* 📦 Video list (NOT persisted) */
  const [videos, setVideos] = useState<Post[]>([]);

  /* ---------------------------------------------
   * INIT FROM STORAGE
   * ------------------------------------------- */
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored !== null) setMutedState(stored === "true");
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(VIDEO_STATE_KEY);
    if (!raw) return;
    try {
      setSavedState(JSON.parse(raw));
    } catch {}
  }, []);

  /* ---------------------------------------------
   * AUDIO CONTROLS
   * ------------------------------------------- */
  const setMuted = (value: boolean) => {
    setMutedState(value);
    sessionStorage.setItem(STORAGE_KEY, String(value));
  };

  const toggleMute = () => setMuted(!muted);

  /* ---------------------------------------------
   * SAVE PLAYBACK STATE
   * ------------------------------------------- */
  const saveVideoState = (patch: Partial<SavedVideoState>) => {
    setSavedState((prev) => {
      const next = { ...prev, ...patch };
      sessionStorage.setItem(VIDEO_STATE_KEY, JSON.stringify(next));
      return next;
    });
  };

  /* ---------------------------------------------
   * CONTEXT VALUE
   * ------------------------------------------- */
  return (
    <VideoSettingsContext.Provider
      value={{
        muted,
        setMuted,
        toggleMute,
        savedState,
        saveVideoState,
        videos,
        setVideos,
      }}
    >
      {children}
    </VideoSettingsContext.Provider>
  );
}

/* ---------------------------------------------
 * HOOK
 * ------------------------------------------- */
export function useVideoSettings() {
  const ctx = useContext(VideoSettingsContext);
  if (!ctx) {
    throw new Error("useVideoSettings must be used inside provider");
  }
  return ctx;
}
