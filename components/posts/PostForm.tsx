"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import PostEditorWrapper, {
  PostEditorWrapperRef,
} from "@/components/posts/PostEditorWrapper";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface PostFormProps {
  onSubmit: (
    title: string,
    content: string,
    authorId: string | null
  ) => Promise<void>;
}

export default function PostForm({ onSubmit }: PostFormProps) {
  const [title, setTitle] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();
  const editorRef = useRef<PostEditorWrapperRef>(null);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const authorId = user?.uid || null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const html = editorRef.current?.getHTML?.() ?? "";

    setSubmitting(true);
    try {
      await onSubmit(title, html, authorId);
      editorRef.current?.clearEditor?.();
      setTitle("");
      setResetKey((k) => k + 1);
    } catch (err) {
      console.error("❌ Error while posting:", err);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const input = titleRef.current;
    if (!input) return;

    const handleFocusIn = () => setIsTitleFocused(true);
    const handleFocusOut = (e: FocusEvent) => {
      if (!input.contains(e.relatedTarget as Node)) {
        setIsTitleFocused(false);
      }
    };

    input.addEventListener("focusin", handleFocusIn);
    input.addEventListener("focusout", handleFocusOut);

    return () => {
      input.removeEventListener("focusin", handleFocusIn);
      input.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onSubmit={handleSubmit}
      className="flex flex-col h-full min-h-0 space-y-4 bg-white dark:bg-neutral-900 p-4 rounded-lg"
    >
      {/* Title Input with wrapper focus styling */}
      <div
        className={`rounded-lg border transition ${
          isTitleFocused
            ? "border-black dark:border-white shadow-md"
            : "border-gray-300 dark:border-gray-500"
        }`}
      >
        <input
          ref={titleRef}
          type="text"
          placeholder={t("title") || "Title"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
          className="w-full text-xl font-medium px-4 py-3 bg-transparent
               focus:outline-none focus:ring-0"
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-neutral-900 rounded-md">
        <PostEditorWrapper key={resetKey} ref={editorRef} value={""} />
      </div>

      <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-gray-700 pt-3 pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <img
              src={
                user?.picture
                  ? `${user.picture}?t=${Date.now()}`
                  : "/default-avatar.png"
              }
              alt="avatar"
              className="w-8 h-8 rounded-full border"
            />
            <span>
              Posting as{" "}
              <strong>
                {loading ? "Loading..." : user?.name ?? "Anonymous"}
              </strong>
            </span>
          </div>

          <button
            type="submit"
            disabled={submitting || loading}
            className={`px-6 py-2 rounded-lg font-medium ${
              submitting || loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}
          >
            {submitting ? "Posting..." : "Post"}
          </button>
        </div>
      </div>
    </motion.form>
  );
}
