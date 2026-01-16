"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type VideoSettingsContextType = {
  muted: boolean;
  toggleMute: () => void;
  setMuted: (v: boolean) => void;
};

const VideoSettingsContext = createContext<VideoSettingsContextType | null>(
  null
);

const STORAGE_KEY = "video-muted";

export function VideoSettingsProvider({ children }: { children: ReactNode }) {
  const [muted, setMutedState] = useState(true);

  /* -----------------------------------------
   * LOAD FROM SESSION (ONCE)
   * ----------------------------------------- */
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setMutedState(stored === "true");
    }
  }, []);

  /* -----------------------------------------
   * PERSIST TO SESSION
   * ----------------------------------------- */
  const setMuted = (value: boolean) => {
    setMutedState(value);
    sessionStorage.setItem(STORAGE_KEY, String(value));
  };

  const toggleMute = () => {
    setMuted(!muted);
  };

  return (
    <VideoSettingsContext.Provider
      value={{
        muted,
        setMuted,
        toggleMute,
      }}
    >
      {children}
    </VideoSettingsContext.Provider>
  );
}

export function useVideoSettings() {
  const ctx = useContext(VideoSettingsContext);
  if (!ctx) {
    throw new Error(
      "useVideoSettings must be used inside VideoSettingsProvider"
    );
  }
  return ctx;
}
