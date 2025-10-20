"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";

// Use the wrapper to make editor stable with HMR
const PostEditorWrapper = dynamic(() => import("./PostEditorWrapper"), {
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
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [author, setAuthor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAuthor("Anonymous");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() && !content.trim()) return;

    setSubmitting(true);
    await onSubmit(title, content, author);
    setTitle("");
    setContent("");
    setSubmitting(false);
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
        placeholder="Title"
        className="w-full border border-black rounded p-2"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        disabled={submitting}
      />
      <PostEditorWrapper onChange={setContent} />
      <div className="text-sm text-gray-600">
        Posting as : <span className="font-medium">{author}</span>
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:bg-gray-400 w-full"
      >
        {submitting ? "Posting..." : "Post"}
      </button>
    </motion.form>
  );
}
