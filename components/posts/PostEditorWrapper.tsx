"use client";

import { useEffect } from "react";
import PostEditorInner from "./PostEditorInner";

export default function PostEditorWrapper({
  onChange,
}: {
  onChange: (contentHtml: string) => void;
}) {
  useEffect(() => {
    // 👇 This ensures the editor doesn't “steal focus” on mount
    requestAnimationFrame(() => {
      const active = document.activeElement as HTMLElement | null;
      if (active && active.tagName === "BODY") {
        active.blur();
      }
    });
  }, []);

  return <PostEditorInner onChange={onChange} />;
}
