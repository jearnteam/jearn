"use client";

import { createContext, useContext, useState } from "react";

export type UploadStage = "idle" | "uploading" | "processing" | "done";

interface UploadContextValue {
  uploading: boolean;
  progress: number;
  stage: UploadStage;
  start: () => void;
  setUploading: (percent: number) => void;
  setProcessing: () => void;
  finish: () => void;
  reset: () => void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

export function UploadProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<UploadStage>("idle");

  const start = () => {
    setProgress(0);
    setStage("uploading");
  };

  const setUploading = (percent: number) => {
    setProgress(Math.min(90, percent));
    setStage("uploading");
  };

  const setProcessing = () => {
    setProgress(95);
    setStage("processing");
  };

  const finish = () => {
    setProgress(100);
    setStage("done");
  };

  const reset = () => {
    setProgress(0);
    setStage("idle");
  };

  return (
    <UploadContext.Provider
      value={{
        uploading: stage !== "idle" && stage !== "done",
        progress,
        stage,
        start,
        setUploading,
        setProcessing,
        finish,
        reset,
      }}
    >
      {children}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used inside UploadProvider");
  return ctx;
}