"use client";

import FullScreenPortal from "@/features/FullScreenPortal";
import GraphView from "@/components/graphview/GraphView";
import type { Post } from "@/types/post";

export default function PostGraphModal({
  open,
  post,
  onClose,
}: {
  open: boolean;
  post: Post;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <FullScreenPortal>
      <div
        className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center p-6"
        onClick={onClose}
      >
        <div
          className="relative max-w-4xl w-full h-[80vh] rounded-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-[50] w-12 h-12 flex items-center justify-center rounded-full bg-black/70 text-white text-2xl hover:bg-black/90"
          >
            ×
          </button>

          <div className="w-full h-full border border-blue-500 overflow-auto">
            <GraphView post={post} />
          </div>
        </div>
      </div>
    </FullScreenPortal>
  );
}
