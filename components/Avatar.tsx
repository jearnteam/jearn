"use client";

import { useChatSocket } from "@/features/chat/ChatSocketProvider";
import { avatarUrl } from "@/lib/avatarUrl";
import { useState } from "react";

interface AvatarProps {
  id?: string | null;
  url?: string; // optional override
  updatedAt?: string | Date | null;
  size?: number;
  className?: string;
}

export default function Avatar({
  id,
  url,
  updatedAt,
  size = 40,
  className = "",
}: AvatarProps) {
  const { onlineUserIds } = useChatSocket();

  const isOnline = id ? onlineUserIds.has(id) : false;
  const dotSize = Math.max(8, size * 0.25);

  // ✅ Single source of truth for avatar URL
  const initialSrc = url ?? avatarUrl(id, updatedAt);

  const [src, setSrc] = useState(initialSrc);

  return (
    <div
      className={`relative inline-block ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        onError={() =>
          setSrc("https://cdn.jearn.site/avatars/default.webp")
        }
        alt="avatar"
        className="rounded-full object-cover w-full h-full"
      />

      {/* ONLINE DOT */}
      {isOnline && (
        <span
          style={{ width: dotSize, height: dotSize }}
          className="absolute bottom-0 right-0 bg-green-500 rounded-full ring-2 ring-white dark:ring-black"
        />
      )}
    </div>
  );
}