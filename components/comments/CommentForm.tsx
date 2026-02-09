// components/comments/CommentForm.tsx
"use client";

import { useRef, useState, useMemo, useEffect } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import PostEditorWrapper, {
  PostEditorWrapperRef,
} from "@/components/posts/PostEditorWrapper";
import { useTranslation } from "react-i18next";

interface Props {
  parentId: string;
  replyTo?: string | null;
  onSubmitted?: (content: string) => void | Promise<void>; // ✅ updated type
  onCancel?: () => void;
  mode?: "comment" | "reply";
  editorRefFromParent?: React.MutableRefObject<PostEditorWrapperRef | null>;
  autoFocus?: boolean;
}

export default function CommentForm({
  parentId,
  replyTo = null,
  onSubmitted,
  onCancel,
  mode = "comment",
  editorRefFromParent,
  autoFocus = false,
}: Props) {
  const { t } = useTranslation();

  const innerRef = useRef<PostEditorWrapperRef>(null);
  const editorRef = editorRefFromParent ?? innerRef;

  const [submitting, setSubmitting] = useState(false);
  const { user } = useCurrentUser();

  const placeholder = useMemo(
    () => (mode === "reply" ? "Write a reply..." : "Write a comment..."),
    [mode]
  );

  useEffect(() => {
    if (!autoFocus) return;
    const id1 = requestAnimationFrame(() => {
      const id2 = requestAnimationFrame(() => {
        editorRef.current?.focus?.();
      });
      return () => cancelAnimationFrame(id2);
    });
    return () => cancelAnimationFrame(id1);
  }, [autoFocus, editorRef]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return alert("Please log in.");

    const html = editorRef.current?.getHTML?.() ?? "";
    if (!html.trim()) return;

    setSubmitting(true);
    try {
      await onSubmitted?.(html); // ✅ passing content properly
      editorRef.current?.clearEditor?.();
    } catch (err) {
      console.error("❌ add comment/reply failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {replyTo && (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          You’re replying to a comment
        </div>
      )}

      <div className="relative px-2 py-4">
        <PostEditorWrapper
          ref={editorRef}
          value="" // TODO: 
          placeholder={placeholder}
          compact
        />
      </div>

      <div className="flex items-center gap-3 self-end pb-1 pt-1">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="text-sm text-gray-600 hover:underline dark:text-gray-300"
          >
            {t("cancel")}
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className={`px-4 py-2 rounded-md text-white ${
            submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {submitting
            ? mode === "reply"
              ? "Replying..."
              : "Posting..."
            : mode === "reply"
            ? "Reply"
            : (t("postComment"))}
        </button>
      </div>
    </form>
  );
}
