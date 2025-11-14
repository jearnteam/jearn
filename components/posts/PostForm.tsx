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
    authorId: string | null,
    categories: string[]
  ) => Promise<void>;
}

interface Category {
  label: string;
  score: number;
}

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

  /** ❗ FIX: Force re-render when user loads */
  const [ready, setReady] = useState(false);

  useEffect(() => {
    console.log("POSTFORM USER =", user);
    if (!loading) setReady(true);
  }, [loading, user]);

  /** Use MongoDB _id for author identity */
  const authorId = user?._id || null;

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
    if (selected.length === 0) return alert("Choose a category.");

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

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-full space-y-4 bg-white dark:bg-neutral-900 p-4 rounded-lg"
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
          type="text"
          placeholder={t("title") || "Title"}
          value={title}
          onFocus={() => setIsTitleFocused(true)}
          onBlur={() => setIsTitleFocused(false)}
          onChange={(e) => setTitle(e.target.value)}
          disabled={submitting}
          className="w-full text-xl px-4 py-3 bg-transparent focus:outline-none"
        />
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto rounded-md">
        <PostEditorWrapper key={resetKey} ref={editorRef} value={""} />
      </div>

      {/* Category Section */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t dark:border-gray-700">
          {categories.map((cat) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => handleSelectCategory(cat.label)}
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                selected.includes(cat.label)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700"
              }`}
            >
              {cat.label} ({(cat.score * 100).toFixed(1)}%)
            </button>
          ))}
        </div>
      )}

      {/* Bottom Section */}
      <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t dark:border-gray-700 pt-3 pb-4">
        <div className="flex justify-between items-center">
          {/* User Info */}
          <div className="flex items-center gap-2 text-sm">
            <img
              src={
                user?.picture
                  ? `${user.picture}?t=${Date.now()}`
                  : "/default-avatar.png"
              }
              className="w-8 h-8 rounded-full border"
            />
            <span>
              Posting as <strong>{user?.name ?? "Anonymous"}</strong>
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            {categories.length === 0 ? (
              <button
                type="button"
                disabled={checking}
                onClick={handleCheckCategories}
                className="px-6 py-2 rounded-lg bg-yellow-500 text-white disabled:bg-gray-400"
              >
                {checking ? "Checking..." : "Check Categories"}
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting || loading || selected.length === 0}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white disabled:bg-gray-400"
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
