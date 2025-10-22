"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";

const PostEditorInner = dynamic(() => import("./PostEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="p-4 rounded-lg bg-gray-100 animate-pulse h-36"></div>
  ),
});

export default function PostEditorWrapper({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  return <PostEditorInner value={value} onChange={onChange} />;
}