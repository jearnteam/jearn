"use client";

import { useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";

import PostOverlayShell from "@/app/(app)/posts/[id]/PostOverlayShell";

/* --------------------------------------------------
 *  REELS DATA — ADD YOUR VIDEO LINKS HERE
 * -------------------------------------------------- */
const REELS = [
  {
    id: "v1",
    src: "https://cdn.jearn.site/Videos/test.mp4",
    title: "Test Reel 1",
  },
  {
    id: "v2",
    src: "https://cdn.jearn.site/Videos/test2.mp4",
    title: "Test Reel 2",
  },
  {
    id: "v3",
    src: "https://cdn.jearn.site/Videos/test3.mp4",
    title: "Test Reel 3",
  },
];

export default function VideoReelsPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);

  /* --------------------------------------------------
   *  Auto-play only visible video
   * -------------------------------------------------- */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const videos = Array.from(
      container.querySelectorAll("video")
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;

          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.6 }
    );

    videos.forEach((v) => observer.observe(v));
    return () => observer.disconnect();
  }, []);

  return (
    <PostOverlayShell onClose={() => router.push("/")}>
      {() => (
        <div
          ref={containerRef}
          className="
            h-[calc(100vh-3.5rem)]
            overflow-y-scroll
            snap-y
            snap-mandatory
            bg-black
          "
        >
          {REELS.map((video) => (
            <div
              key={video.id}
              className="
                h-full
                w-full
                snap-start
                relative
                flex
                items-center
                justify-center
                bg-black
              "
            >
              {/* Video (FULL WIDTH, natural height) */}
              <video
                src={video.src}
                className="w-full h-auto max-h-full"
                playsInline
                muted
                loop
                preload="metadata"
              />

              {/* Right-side buttons */}
              <div className="absolute right-3 bottom-24 flex flex-col items-center gap-4 text-white">
                <button className="hover:scale-110 transition">
                  <Heart size={28} />
                </button>

                <button className="hover:scale-110 transition">
                  <MessageCircle size={28} />
                </button>

                <button className="hover:scale-110 transition">
                  <Share2 size={28} />
                </button>
              </div>

              {/* Title / description */}
              <div className="absolute left-4 bottom-24 text-white max-w-[70%]">
                <p className="text-sm font-semibold">
                  {video.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </PostOverlayShell>
  );
}
