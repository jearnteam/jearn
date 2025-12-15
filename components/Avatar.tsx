"use client";

import { useEffect, useState } from "react";

interface AvatarProps {
  id: string;
  url?: string;
  updatedAt?: string | Date;
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
  const [src, setSrc] = useState("/default-avatar.png");

  useEffect(() => {
    if (!id && !url) return;

    const ts = updatedAt ? `?t=${new Date(updatedAt).getTime()}` : "";

    if (url) {
      setSrc(`${url}${ts}`);
    } else {
      setSrc(`https://cdn.jearn.site/avatars/${id}.webp${ts}`);
    }
  }, [id, url, updatedAt]);

  return (
    <img
      src={src}
      onError={() => setSrc("/default-avatar.png")}
      width={size}
      height={size}
      alt="avatar"
      className={`rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
