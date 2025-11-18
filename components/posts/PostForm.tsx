"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

  const [contentChanged, setContentChanged] = useState(true);

  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [categoryReady, setCategoryReady] = useState(false);

  const editorRef = useRef<PostEditorWrapperRef>(null);
  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();

  const authorId = user?._id || null;

  /* -------------------------------------------------------------------------- */
  /*                                CHECK CATEGORIES                            */
  /* -------------------------------------------------------------------------- */

  const handleCheckCategories = async () => {
    const html = editorRef.current?.getHTML() ?? "";
    const text = html.replace(/<[^>]+>/g, "").trim();
    if (!text) return;

    setContentChanged(false);
    setCategoryReady(false);
    setChecking(true);
    setCategories([]);
    setSelected([]);
    setVisibleCount(5);

    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) throw new Error("Categorization failed");

      const data: Category[] = await res.json();

      setCategories(data.slice(0, 15));
      setCategoryReady(true);
      setContentChanged(false);
    } catch (err) {
      console.error("❌ Category check failed:", err);
      setCategoryReady(false);
    } finally {
      setChecking(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                            USER EDIT TRIGGER                               */
  /* -------------------------------------------------------------------------- */

  const handleEditorUpdate = () => {
    setContentChanged(true);
  };

  /* -------------------------------------------------------------------------- */
  /*                          SELECT CATEGORY CLICK                             */
  /* -------------------------------------------------------------------------- */

  const handleSelectCategory = (label: string) => {
    setSelected((p) =>
      p.includes(label) ? p.filter((x) => x !== label) : [...p, label]
    );
  };

  /* -------------------------------------------------------------------------- */
  /*                                   SUBMIT                                   */
  /* -------------------------------------------------------------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;
    if (selected.length === 0) return alert("Choose a category.");

    const html = editorRef.current?.getHTML() ?? "";

    setSubmitting(true);
    try {
      await onSubmit(title, html, authorId, selected);

      editorRef.current?.clearEditor();
      setCategories([]);
      setSelected([]);
      setTitle("");
      setResetKey((k) => k + 1);
      setContentChanged(true);
    } catch (err) {
      console.error("❌ Error posting:", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                              ARRANGE CATEGORIES                            */
  /* -------------------------------------------------------------------------- */

  const ordered = [
    ...categories.filter((c) => selected.includes(c.label)),
    ...categories.filter((c) => !selected.includes(c.label)),
  ];

  const visibleCats = ordered.slice(0, visibleCount);

  /* -------------------------------------------------------------------------- */
  /*                                   RENDER                                   */
  /* -------------------------------------------------------------------------- */

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col h-full space-y-4 bg-white dark:bg-neutral-900 p-4 rounded-lg"
    >
      {/* ------------------------------ Title ------------------------------ */}
      <motion.div
        animate={{
          boxShadow: isTitleFocused
            ? "0px 0px 12px rgba(0,0,0,0.15)"
            : "0px 0px 0px rgba(0,0,0,0)",
        }}
        className={`rounded-lg border transition ${
          isTitleFocused
            ? "border-black dark:border-white"
            : "border-gray-300 dark:border-gray-500"
        }`}
      >
        <input
          type="text"
          placeholder={t("title") || "Title"}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setContentChanged(true);
          }}
          onFocus={() => setIsTitleFocused(true)}
          onBlur={() => setIsTitleFocused(false)}
          className="w-full text-xl px-2 py-3 bg-transparent focus:outline-none"
        />
      </motion.div>

      {/* ------------------------------ Editor ------------------------------ */}
      <div className="flex-1 overflow-y-auto rounded-md">
        <PostEditorWrapper
          key={resetKey}
          ref={editorRef}
          value=""
          onUpdate={handleEditorUpdate}
        />
      </div>

      {/* ------------------------------ Categories ------------------------------ */}
      <AnimatePresence>
        {!contentChanged && categoryReady && categories.length > 0 && (
          <motion.div
            key="cat-list"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.25 }}
            className="space-y-3"
          >
            <motion.div layout className="overflow-hidden">
              <motion.div
                layout
                className="flex flex-wrap gap-3"
                transition={{
                  layout: { duration: 0.35, ease: "easeInOut" },
                }}
              >
                {visibleCats.map((cat) => {
                  const isSelected = selected.includes(cat.label);

                  return (
                    <motion.div
                      key={cat.label}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex flex-col"
                    >
                      <motion.button
                        layout
                        whileTap={{ scale: 0.92 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => handleSelectCategory(cat.label)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                          isSelected
                            ? "bg-blue-600 text-white shadow"
                            : "bg-gray-200 dark:bg-gray-700"
                        }`}
                      >
                        {cat.label}
                      </motion.button>

                      <div className="w-full h-1.5 bg-gray-300 dark:bg-neutral-800 mt-1 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cat.score * 100}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full bg-blue-500 dark:bg-blue-400"
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </motion.div>

            <motion.div layout className="flex gap-4 text-sm">
              {visibleCount < ordered.length && (
                <button
                  onClick={() => setVisibleCount((v) => v + 5)}
                  className="text-blue-500 hover:underline"
                >
                  Show more
                </button>
              )}
              {visibleCount > 5 && (
                <button
                  onClick={() => setVisibleCount(5)}
                  className="text-blue-500 hover:underline"
                >
                  Show less
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ------------------------------ Footer ------------------------------ */}
      <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t dark:border-gray-700 pt-3 pb-4">
        <div className="flex justify-between items-center">
          {/* User info */}
          <div className="flex items-center gap-2 text-sm">
            {user ? (
              <img
                src={`${user.picture}?t=${Date.now()}`}
                className="w-8 h-8 rounded-full border border-gray-300 dark:border-neutral-700"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-300 dark:bg-neutral-700 animate-pulse rounded-full" />
            )}

            <span className="flex items-center gap-1">
              Posting as{" "}
              {user ? (
                <strong>{user.name}</strong>
              ) : (
                <div className="inline-block w-24 h-5 bg-gray-300 dark:bg-neutral-700 animate-pulse rounded-md" />
              )}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 items-center">
            {categories.length === 0 || contentChanged ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.03 }}
                type="button"
                disabled={checking}
                onClick={handleCheckCategories}
                className="px-6 py-2 rounded-lg bg-yellow-500 text-white disabled:bg-gray-400 transition"
              >
                {checking ? "Checking..." : "Check Categories"}
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.93 }}
                whileHover={{ scale: 1.05 }}
                type="submit"
                disabled={submitting || loading || selected.length === 0}
                className="px-6 py-2 rounded-lg bg-blue-600 text-white disabled:bg-gray-400 transition"
              >
                {submitting ? "Submitting..." : "Submit"}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.form>
  );
}
