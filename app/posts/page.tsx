"use client";

import { useEffect } from "react";
import PostsMain from "./PostsMain";

export default function PostsPage() {
  useEffect(() => {
    // restore to specific post
    const id = sessionStorage.getItem("restore-post-id");
    if (id) return; // handled by PostList

    // fallback: restore scroll position
    const y = sessionStorage.getItem("restore-scroll-y");
    if (y) window.scrollTo(0, Number(y));
  }, []);

  return (
    <div className="pt-[72px] md:pt-[88px]">
      <PostsMain />
    </div>
  );
}
