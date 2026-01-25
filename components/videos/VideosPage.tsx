"use client";

import { useEffect, useRef } from "react";
import type { Post } from "@/types/post";
import VideosItem from "./VideosItem";
import { VideoPlaybackProvider } from "./VideoPlaybackContext";
import { useVideoSettings } from "./VideoSettingsContext";

export default function VideosPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    savedState,
    saveVideoState,
    videos,
    setVideos,
  } = useVideoSettings();

  /* -------------------------------------------------
   * 💾 SAVE CURRENT VIDEO STATE (EVENT-BASED)
   * ------------------------------------------------- */
  useEffect(() => {
    function handler() {
      const active = document.querySelector(
        "video[data-active='true']"
      ) as HTMLVideoElement | null;

      saveVideoState({
        videoId: active?.dataset.id ?? null,
        time: active?.currentTime ?? 0,
        paused: active ? active.paused : true,
        scrollTop: containerRef.current?.scrollTop ?? 0,
      });
    }

    window.addEventListener("videos:save-state", handler);
    return () => window.removeEventListener("videos:save-state", handler);
  }, [saveVideoState]);

  /* -------------------------------------------------
   * 🔒 SAVE STATE ON UNMOUNT (SAFETY NET)
   * ------------------------------------------------- */
  useEffect(() => {
    return () => {
      window.dispatchEvent(new Event("videos:save-state"));
    };
  }, []);

  /* -------------------------------------------------
   * 🔁 RESTORE SAVED VIDEO STATE (ONCE, AFTER DOM READY)
   * ------------------------------------------------- */
  const restoredRef = useRef(false);

  useEffect(() => {
    if (!savedState.videoId) return;
    if (!videos.length) return;
    if (restoredRef.current) return;

    restoredRef.current = true;

    let tries = 0;

    function tryRestore() {
      const video = document.querySelector(
        `video[data-id='${savedState.videoId}']`
      ) as HTMLVideoElement | null;

      if (!video) {
        if (tries++ < 10) {
          requestAnimationFrame(tryRestore);
        }
        return;
      }

      // ⏱ restore playback position
      video.currentTime = savedState.time;

      // ▶️ restore playback state
      if (!savedState.paused) {
        video.play().catch(() => {});
      }

      // 📜 restore scroll position
      if (containerRef.current) {
        containerRef.current.scrollTop = savedState.scrollTop;
      }
    }

    requestAnimationFrame(tryRestore);
  }, [videos, savedState]);

  /* -------------------------------------------------
   * 📡 FETCH VIDEO POSTS (ONCE PER SESSION)
   * ------------------------------------------------- */
  useEffect(() => {
    if (videos.length) return;

    fetch("/api/posts/videos", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setVideos(d.items ?? []);
      })
      .catch(() => {});
  }, [videos, setVideos]);

  return (
    <VideoPlaybackProvider>
      <div ref={containerRef} className="w-full h-full">
        {videos.map((post: Post) => (
          <VideosItem key={post._id} post={post} />
        ))}
      </div>
    </VideoPlaybackProvider>
  );
}
