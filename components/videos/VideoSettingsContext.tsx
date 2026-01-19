"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type SavedVideoState = {
  videoId: string | null;
  time: number;
  paused: boolean;
  scrollTop: number;
};

type VideoSettingsContextType = {
  muted: boolean;
  toggleMute: () => void;
  setMuted: (v: boolean) => void;

  savedState: SavedVideoState;
  saveVideoState: (v: Partial<SavedVideoState>) => void;
};

const VideoSettingsContext = createContext<VideoSettingsContextType | null>(null);

const STORAGE_KEY = "video-muted";
const VIDEO_STATE_KEY = "video-playback-state";

export function VideoSettingsProvider({ children }: { children: ReactNode }) {
  const [muted, setMutedState] = useState(true);

  const [savedState, setSavedState] = useState<SavedVideoState>({
    videoId: null,
    time: 0,
    paused: true,
    scrollTop: 0,
  });

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

  const setMuted = (value: boolean) => {
    setMutedState(value);
    sessionStorage.setItem(STORAGE_KEY, String(value));
  };

  const toggleMute = () => setMuted(!muted);

  const saveVideoState = (patch: Partial<SavedVideoState>) => {
    setSavedState((prev) => {
      const next = { ...prev, ...patch };
      sessionStorage.setItem(VIDEO_STATE_KEY, JSON.stringify(next));
      return next;
    });
  };

  return (
    <VideoSettingsContext.Provider
      value={{ muted, setMuted, toggleMute, savedState, saveVideoState }}
    >
      {children}
    </VideoSettingsContext.Provider>
  );
}

export function useVideoSettings() {
  const ctx = useContext(VideoSettingsContext);
  if (!ctx) throw new Error("useVideoSettings must be used inside provider");
  return ctx;
}
