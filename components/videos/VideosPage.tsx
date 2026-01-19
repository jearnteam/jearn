"use client";

import { useEffect, useRef, useState } from "react";
import type { Post } from "@/types/post";
import VideosItem from "./VideosItem";
import { VideoPlaybackProvider } from "./VideoPlaybackContext";
import { useVideoSettings } from "./VideoSettingsContext";

export default function VideosPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const { savedState, saveVideoState } = useVideoSettings();

  useEffect(() => {
    function handler() {
      const active = document.querySelector(
        "video[data-active='true']",
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
  }, []);

  useEffect(() => {
    if (!savedState.videoId) return;

    requestAnimationFrame(() => {
      const video = document.querySelector(
        `video[data-id='${savedState.videoId}']`,
      ) as HTMLVideoElement | null;

      if (!video) return;

      video.currentTime = savedState.time;

      if (!savedState.paused) {
        video.play().catch(() => {});
      }

      if (containerRef.current) {
        containerRef.current.scrollTop = savedState.scrollTop;
      }
    });
  }, [posts]);

  useEffect(() => {
    fetch("/api/posts/videos", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPosts(d.items ?? []));
  }, []);

  return (
    <VideoPlaybackProvider>
      <div ref={containerRef} className="w-full h-full">
        {posts.map((post) => (
          <VideosItem key={post._id} post={post} />
        ))}
      </div>
    </VideoPlaybackProvider>
  );
}
