"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

// ✅ Dynamic import here (NOT in PostForm)
const PostEditorInner = dynamic(() => import("./PostEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="p-4 rounded-lg bg-gray-100 animate-pulse h-36"></div>
  ),
});

export default function PostEditorWrapper({
  onChange,
}: {
  onChange: (html: string) => void;
}) {
  useEffect(() => {
    requestAnimationFrame(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active.tagName === "BODY") active.blur();
    });
  }, []);

  return <PostEditorInner onChange={onChange} />;
}
