"use client";

import { useEffect, useRef, useState } from "react";
import type { Post } from "@/types/post";
import { useVideoSettings } from "./VideoSettingsContext";
import { useVideoPlayback } from "./VideoPlaybackContext";
import {
  VolumeX,
  Volume2,
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
  Play,
} from "lucide-react";
import { motion } from "framer-motion";

const CDN = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

function resolveAvatar(post: Post) {
  if (post.authorAvatar) return post.authorAvatar;
  if (post.authorId && post.authorAvatarUpdatedAt) {
    return `${CDN}/avatars/${post.authorId}.webp?t=${new Date(
      post.authorAvatarUpdatedAt
    ).getTime()}`;
  }
  return "/default-avatar.png";
}

export default function VideosItem({ post }: { post: Post }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  const pausedByUserRef = useRef(false);
  const wasIntersectingRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const { muted, toggleMute } = useVideoSettings();
  const { setActive, clearActive } = useVideoPlayback();

  const [showPauseIcon, setShowPauseIcon] = useState(false);
  const isPausedRef = useRef(false);
  const shouldPlayRef = useRef(false);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const [progress, setProgress] = useState(0); // 0 → 1
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [duration, setDuration] = useState(0);
  const lastTimeRef = useRef(0);

  /* --------------------------------------------------
   * VISIBILITY + GLOBAL PLAYBACK
   * -------------------------------------------------- */
  useEffect(() => {
    const el = wrapperRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;

        if (!isIntersecting && wasIntersectingRef.current) {
          video.pause();
          shouldPlayRef.current = false;
          setIsLoading(false);
          pausedByUserRef.current = false;
          setShowPauseIcon(false);
          clearActive(post._id);
        }

        if (isIntersecting && !wasIntersectingRef.current) {
          video.currentTime = 0;
          if (!pausedByUserRef.current) {
            shouldPlayRef.current = true;
            setActive(post._id, video);
          }
        }

        wasIntersectingRef.current = isIntersecting;
      },
      { threshold: 0.6 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [post._id, setActive, clearActive]);

  /* --------------------------------------------------
   * PROGRESS TRACKING
   * -------------------------------------------------- */
  useEffect(() => {
    const video = videoRef.current;
    lastTimeRef.current = 0;
    if (!video) return;

    setIsLoading(true);
    setHasError(false);

    const onLoadedMetadata = () => {
      setDuration(video.duration || 0);
    };

    const onTimeUpdate = () => {
      if (!video.duration || isScrubbing) return;

      const current = video.currentTime;

      // 🔥 SAFETY: if time is advancing, video is playing → stop loading
      if (current !== lastTimeRef.current) {
        setIsLoading(false);
        lastTimeRef.current = current;
      }

      setProgress(current / video.duration);
    };

    const onWaiting = () => {
      if (!shouldShowLoading(video)) return;
      setIsLoading(true);
    };

    const onStalled = () => {
      if (!shouldShowLoading(video)) return;
      setIsLoading(true);
    };

    const onLoadStart = () => {
      if (!shouldShowLoading(video)) return;
      setIsLoading(true);
    };

    const onSeeking = () => {
      // ❌ DO NOT show spinner when paused + scrubbing
      if (!shouldShowLoading(video)) return;
      setIsLoading(true);
    };

    const onSeeked = () => {
      // seek finished → if we intended to play, hide loader
      if (!shouldPlayRef.current) return;
      setIsLoading(false);
    };

    const onPlaying = () => {
      if (!shouldPlayRef.current) return;
      setIsLoading(false);
    };

    const onCanPlay = () => {
      if (!shouldPlayRef.current) return;
      setIsLoading(false);
    };

    const onError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("timeupdate", onTimeUpdate);

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("stalled", onStalled);
    video.addEventListener("loadstart", onLoadStart);

    video.addEventListener("seeking", onSeeking);
    video.addEventListener("seeked", onSeeked);

    video.addEventListener("playing", onPlaying);
    video.addEventListener("canplay", onCanPlay);

    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("stalled", onStalled);
      video.removeEventListener("loadstart", onLoadStart);
      video.removeEventListener("seeking", onSeeking);
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, [post.video?.url, isScrubbing]);

  /* --------------------------------------------------
   * TAP HANDLER (VIDEO ONLY)
   * -------------------------------------------------- */
  function handleTap() {
    if (isScrubbing) return;

    const video = videoRef.current;
    if (!video) return;

    if (singleTapTimeoutRef.current) {
      clearTimeout(singleTapTimeoutRef.current);
      singleTapTimeoutRef.current = null;
      setLiked((v) => !v);
      return;
    }

    singleTapTimeoutRef.current = setTimeout(() => {
      singleTapTimeoutRef.current = null;

      if (video.paused) {
        pausedByUserRef.current = false;
        shouldPlayRef.current = true;
        setShowPauseIcon(false);
        setActive(post._id, video);
      } else {
        video.pause();
        pausedByUserRef.current = true;
        shouldPlayRef.current = false;
        setIsLoading(false);
        setShowPauseIcon(true);
        clearActive(post._id);
      }
    }, 260);
  }

  function formatTime(sec: number) {
    if (!isFinite(sec)) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  /* --------------------------------------------------
   * SCRUBBER
   * -------------------------------------------------- */
  function seek(clientX: number, rect: DOMRect) {
    const video = videoRef.current;
    if (!video || !video.duration) return;

    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const ratio = x / rect.width;

    video.currentTime = ratio * video.duration;
    setProgress(ratio);
  }

  function shouldShowLoading(video: HTMLVideoElement | null) {
    return !!video && shouldPlayRef.current && !video.paused;
  }

  if (!post.video?.url) return null;

  return (
    <div
      ref={wrapperRef}
      className="snap-start w-full h-full flex justify-center items-center"
    >
      <div
        className="relative w-full h-full max-w-[600px] bg-black overflow-hidden"
        onClick={handleTap}
      >
        <video
          ref={videoRef}
          src={post.video.url}
          muted={muted}
          loop
          playsInline
          preload="metadata"
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />

        {/* ⏳ LOADING OVERLAY */}
        {isLoading &&
          !hasError &&
          shouldPlayRef.current && // 🔥 must intend to play
          !showPauseIcon && ( // 🔥 paused UI visible → no spinner
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 pointer-events-none">
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          )}

        {/* ❌ ERROR STATE */}
        {hasError && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 text-white text-sm">
            Failed to load video
          </div>
        )}

        {showPauseIcon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-20 flex items-center justify-center"
          >
            <div className="w-20 h-20 rounded-full bg-black/40 flex items-center justify-center">
              <Play size={36} className="text-white ml-1" />
            </div>
          </motion.div>
        )}

        {/* 🔊 MUTE */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMute();
          }}
          className="absolute top-4 left-4 z-30 bg-black/30 text-white w-12 h-12 rounded-full flex items-center justify-center"
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {/* ⏱ SCRUBBER */}
        <div className="absolute bottom-0 left-0 right-0 z-40">
          {/* 👆 HIT AREA (BIG, INVISIBLE) */}
          <div
            className="absolute left-0 right-0 -top-6 h-10 touch-none"
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.setPointerCapture(e.pointerId);
              setIsScrubbing(true);
              seek(e.clientX, e.currentTarget.getBoundingClientRect());
            }}
            onPointerMove={(e) => {
              if (!isScrubbing) return;
              e.preventDefault();
              seek(e.clientX, e.currentTarget.getBoundingClientRect());
            }}
            onPointerUp={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.currentTarget.releasePointerCapture(e.pointerId);
              setIsScrubbing(false);
            }}
            onPointerCancel={() => setIsScrubbing(false)}
            onClickCapture={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          />

          {/* 🎨 VISUAL BAR (SMALL, PRETTY) */}
          <div className="relative h-2 pointer-events-none">
            {/* track */}
            <div className="absolute inset-0 bg-white/20" />

            {/* progress */}
            <div
              className="absolute inset-y-0 left-0 bg-white"
              style={{ width: `${progress * 100}%` }}
            />

            {/* thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2"
              style={{ left: `${progress * 100}%` }}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white shadow transition-transform ${
                  isScrubbing ? "scale-125" : "scale-100"
                }`}
                style={{ transform: "translateX(-50%)" }}
              />
            </div>
          </div>

          {/* ⏱ TIME LABEL */}
          <div className="absolute right-2 -top-6 text-[11px] text-white/80 font-medium pointer-events-none">
            {formatTime(progress * duration)} / {formatTime(duration)}
          </div>
        </div>

        {/* ❤️ ACTIONS */}
        <div className="absolute right-4 bottom-24 z-30 flex flex-col items-center gap-5 text-white">
          <ActionButton
            active={liked}
            label="12.4K"
            onClick={() => setLiked((v) => !v)}
            icon={
              <Heart
                size={24}
                className={liked ? "fill-red-500 text-red-500" : ""}
              />
            }
          />
          <ActionButton label="324" icon={<MessageCircle size={24} />} />
          <ActionButton
            active={saved}
            onClick={() => setSaved((v) => !v)}
            icon={<Bookmark size={24} className={saved ? "fill-white" : ""} />}
          />
          <ActionButton icon={<Share2 size={24} />} />
        </div>

        {/* 👤 AUTHOR */}
        <div className="absolute left-4 bottom-10 right-20 z-30 text-white">
          <div className="flex items-center gap-3 mb-2">
            <img
              src={resolveAvatar(post)}
              alt={post.authorName}
              className="w-10 h-10 rounded-full object-cover bg-neutral-700"
            />
            <div className="text-sm truncate max-w-[70%]">
              {post.authorName}
            </div>
          </div>

          {post.title && (
            <div className="font-medium leading-snug line-clamp-2">
              {post.title}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="flex flex-col items-center gap-1"
    >
      <div className="w-12 h-12 rounded-full bg-black/30 flex items-center justify-center">
        {icon}
      </div>
      {label && (
        <span className="text-xs font-medium leading-none">{label}</span>
      )}
    </button>
  );
}
