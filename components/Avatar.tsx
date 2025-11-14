"use client";

import { useState, useEffect } from "react";

interface AvatarProps {
  id: string;
  size?: number;
  className?: string;
}

export default function Avatar({
  id,
  size = 40,
  className = "",
}: AvatarProps) {
  const [src, setSrc] = useState("/default-avatar.png");

  useEffect(() => {
    if (!id) return;
    setSrc(`/api/user/avatar/${id}`); // preload handled by PostList
  }, [id]);

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
