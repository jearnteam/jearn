// components/comments/CommentFormModal.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import CommentForm from "@/components/comments/CommentForm";
import Portal from "@/components/common/Portal";
import type { PostEditorWrapperRef } from "@/components/posts/PostEditorWrapper";
import { useTranslation } from "react-i18next";

export default function CommentFormModal({
  parentId,
  onClose,
  onSubmitted, // ✅ Add here
}: {
  parentId: string;
  onClose: () => void;
  onSubmitted: (content: string) => void; // ✅ Add type
}) {
  const { t } = useTranslation();

  const dialogRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<PostEditorWrapperRef | null>(null);
  const [openCount] = useState(() => Date.now()); // stable key per open

  // Focus after first paint so ProseMirror can measure correctly
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      editorRef.current?.focus?.(); // Now valid ✅
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Close on Escape only (safe; doesn't block editor events)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          ref={dialogRef}
          className="bg-white dark:bg-neutral-900 rounded-lg w-full max-w-lg p-4 shadow-xl relative"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-semibold">
              {t("writeComment")}
            </h2>
            <button
              onClick={onClose}
              className="text-xl text-gray-600 hover:text-gray-800 dark:hover:text-gray-300"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Key forces a fresh Tiptap instance each open */}
          <CommentForm
            key={openCount}
            parentId={parentId}
            onSubmitted={onSubmitted}
            editorRefFromParent={editorRef}
            autoFocus
          />
        </div>
      </div>
    </Portal>
  );
}
