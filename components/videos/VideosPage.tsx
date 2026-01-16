"use client";

import { useEffect, useState } from "react";
import type { Post } from "@/types/post";
import VideosItem from "./VideosItem";
import { VideoPlaybackProvider } from "./VideoPlaybackContext";

export default function VideosPage() {
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    fetch("/api/posts/videos", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setPosts(d.items ?? []));
  }, []);

  return (
    <VideoPlaybackProvider>
      <div className="w-full h-full">
        {posts.map((post) => (
          <VideosItem key={post._id} post={post} />
        ))}
      </div>
    </VideoPlaybackProvider>
  );
}
