"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import PostEditorWrapper from "./PostEditorWrapper";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface PostFormProps {
  onSubmit: (
    title: string,
    content: string,
    authorId: string | null,
    authorName: string,
    authorAvatar: string | null
  ) => Promise<void>;
}

export default function PostForm({ onSubmit }: PostFormProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();

  const authorId = user?._id || null;
  const authorName = user?.name || "Anonymous";
  const authorAvatar = user ? `/api/user/avatar/${user._id}?t=${Date.now()}` : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit(title, content, authorId, authorName, authorAvatar);
      setTitle("");
      setContent("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, filter: "blur(6px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.5 }}
      onSubmit={handleSubmit}
      className="text-black relative p-4 bg-white rounded-xl shadow-sm space-y-3 mb-6"
    >
      {submitting && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl z-10">
          <div className="h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <input
        type="text"
        placeholder={t("title")}
        className="w-full border border-black rounded p-2"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={submitting}
      />

      <PostEditorWrapper value={content} onChange={setContent} />

      <div className="flex items-center gap-2 text-sm text-gray-600">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt={authorName}
            className="w-6 h-6 rounded-full object-cover"
          />
        ) : (
          <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs">
            {authorName[0] || "👤"}
          </div>
        )}
        <span>
          Posting as: <strong>{loading ? "Loading..." : authorName}</strong>
        </span>
      </div>

      <button
        type="submit"
        disabled={submitting || loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 w-full"
      >
        {submitting ? "Posting..." : "Post"}
      </button>
    </motion.form>
  );
}
