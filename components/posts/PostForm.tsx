"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import PostEditorWrapper, {
  PostEditorWrapperRef,
} from "@/components/posts/PostEditorWrapper";
import { useCurrentUser } from "@/hooks/useCurrentUser";

/* ---------- Props Type (exported for PostFormBox) ---------- */
export interface PostFormProps {
  onSubmit: (
    title: string,
    content: string,
    authorId: string | null,
    categories: string[]
  ) => Promise<void>;
}

interface Category {
  label: string;
  score: number;
}

/* ---------- Component ---------- */
export default function PostForm({ onSubmit }: PostFormProps) {
  const [title, setTitle] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();
  const editorRef = useRef<PostEditorWrapperRef>(null);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  const authorId = user?.uid || null;

  /* ---------- AI Category Check ---------- */
  const handleCheckCategories = async () => {
    const html = editorRef.current?.getHTML?.() ?? "";
    const text = html.replace(/<[^>]+>/g, "").trim();
    if (!text) return;

    setChecking(true);
    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) throw new Error("Categorization failed");
      const data: Category[] = await res.json();
      setCategories(data.slice(0, 5));
    } catch (err) {
      console.error("❌ Category check failed:", err);
    } finally {
      setChecking(false);
    }
  };

  const handleSelectCategory = (label: string) => {
    setSelected((prev) =>
      prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]
    );
  };

  /* ---------- Submit Handler ---------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (selected.length === 0)
      return alert("Please choose at least one category.");

    const html = editorRef.current?.getHTML?.() ?? "";

    setSubmitting(true);
    try {
      await onSubmit(title, html, authorId, selected);
      editorRef.current?.clearEditor?.();
      setTitle("");
      setSelected([]);
      setCategories([]);
      setResetKey((k) => k + 1);
    } catch (err) {
      console.error("❌ Error while posting:", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- UI ---------- */
  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full min-h-0 space-y-4 bg-white dark:bg-neutral-900 p-4 rounded-lg"
    >
      {/* Title Input */}
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
          onFocus={() => setIsTitleFocused(true)}
          onBlur={() => setIsTitleFocused(false)}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
          className="w-full text-xl font-medium px-4 py-3 bg-transparent focus:outline-none focus:ring-0"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto bg-white dark:bg-neutral-900 rounded-md">
        <PostEditorWrapper key={resetKey} ref={editorRef} value={""} />
      </div>

      {/* Category Section */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-300 dark:border-gray-700">
          {categories.map((cat) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => handleSelectCategory(cat.label)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition ${
                selected.includes(cat.label)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200"
              }`}
            >
              {cat.label} ({(cat.score * 100).toFixed(1)}%)
            </button>
          ))}
        </div>
      )}

      {/* Bottom Section */}
      <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-gray-700 pt-3 pb-4">
        <div className="flex justify-between items-center">
          {/* User Info */}
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

          {/* Action Buttons */}
          <div className="flex gap-3">
            {categories.length === 0 ? (
              <button
                type="button"
                onClick={handleCheckCategories}
                disabled={checking}
                className={`px-6 py-2 rounded-lg font-medium ${
                  checking
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-yellow-500 hover:bg-yellow-600 text-white"
                }`}
              >
                {checking ? "Checking..." : "Check Categories"}
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || loading || selected.length === 0}
                className={`px-6 py-2 rounded-lg font-medium ${
                  submitting || loading || selected.length === 0
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.form>
  );
}
