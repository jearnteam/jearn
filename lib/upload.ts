// lib/upload.ts
import { create } from "zustand";
import type { StateCreator } from "zustand";

export type UploadStage = "idle" | "uploading" | "processing" | "done";

export interface UploadState {
  percent: number;
  stage: UploadStage;
  start: () => void;
  setUploading: (percent: number) => void;
  setProcessing: () => void;
  finish: () => void;
  reset: () => void;
}

const creator: StateCreator<UploadState> = (set) => ({
  percent: 0,
  stage: "idle",

  start: () =>
    set({
      percent: 0,
      stage: "uploading",
    }),

  setUploading: (percent: number) =>
    set({
      percent: Math.min(90, percent),
      stage: "uploading",
    }),

  setProcessing: () =>
    set({
      percent: 95,
      stage: "processing",
    }),

  finish: () =>
    set({
      percent: 100,
      stage: "done",
    }),

  reset: () =>
    set({
      percent: 0,
      stage: "idle",
    }),
});

export const useUpload = create<UploadState>(creator);
