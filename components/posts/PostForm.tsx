"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useTranslation } from "react-i18next";

// Lazy-load the editor (no SSR)
const PostEditorInner = dynamic(() => import("./PostEditorInner"), {
  ssr: false,
  loading: () => (
    <div className="p-4 rounded-lg bg-gray-100 animate-pulse h-36"></div>
  ),
});

export default function PostForm({
  onSubmit,
}: {
  onSubmit: (title: string, content: string, author: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { user, loading } = useCurrentUser();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetCounter, setResetCounter] = useState(0);

  useEffect(() => {
    if (user) setAuthor(user.name || user.email || "Anonymous");
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;
    setSubmitting(true);
    await onSubmit(title, content, author);
    setTitle("");
    setContent("");
    setResetCounter((n) => n + 1);
    setSubmitting(false);
  };

  return (
    <motion.form
      initial={{ opacity: 0, filter: "blur(6px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="text-black relative p-4 bg-white rounded-xl shadow-sm space-y-3 mb-6"
      onSubmit={handleSubmit}
    >
      {submitting && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm rounded-xl z-10">
          <div className="h-6 w-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 📝 Title */}
      <input
        type="text"
        placeholder={t("title")}
        className="w-full border border-black rounded p-2"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={submitting}
      />

      {/* ✍️ Editor */}
      <PostEditorInner key={`editor-${resetCounter}`} onChange={setContent} />

      {/* 👤 Author */}
      {user && (
        <div className="text-sm text-gray-600">
          Posting as : <span className="font-medium">{author}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || loading || !user}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 w-full"
      >
        {submitting ? "adding" : "Post"}
      </button>
    </motion.form>
  );
}
