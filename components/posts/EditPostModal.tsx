"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Portal from "@/components/common/Portal";
import PostEditorWrapper, {
  PostEditorWrapperRef,
} from "@/components/posts/PostEditorWrapper";
import { useTranslation } from "react-i18next";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import i18n from "@/lib/i18n";
import type { Post } from "@/types/post";

/* ------------------------------------------------------- */
/* TYPES */
/* ------------------------------------------------------- */

interface EditPostModalProps {
  post: Post;
  onClose: () => void;
  onSave: (
    title: string,
    content: string,
    categories: string[],
    tags: string[]
  ) => Promise<void>;
}

interface Category {
  id: string;
  label: string;
  jname?: string;
  score: number;
}

/* ------------------------------------------------------- */
/* UTILS */
/* ------------------------------------------------------- */

function extractTextWithMath(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;

  let text = "";

  function walk(node: Node) {
    if (!node) return;

    // Text nodes → append raw text
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? "";
      return;
    }

    // Math node → append latex
    if (node instanceof HTMLElement && node.dataset.type === "math") {
      const latex =
        node.getAttribute("latex") || node.getAttribute("data-latex") || "";
      text += latex + " ";
      return;
    }

    // Walk children normally
    node.childNodes.forEach(walk);
  }

  walk(div);

  return text.replace(/\s+/g, " ").trim();
}

function extractTagsFromHTML(html: string): string[] {
  const div = document.createElement("div");
  div.innerHTML = html;

  const tags: string[] = [];

  div.querySelectorAll("[data-type='tag']").forEach((el) => {
    const v =
      el.getAttribute("value") ||
      el.getAttribute("data-value") ||
      el.textContent?.replace("#", "").trim();

    if (v) tags.push(v);
  });

  return Array.from(new Set(tags));
}

function cleanHTML(html: string) {
  return html.replace(/[\u200B-\u200D\uFEFF]/g, "");
}

/* ------------------------------------------------------- */
/* COMPONENT */
/* ------------------------------------------------------- */

export default function EditPostModal({
  post,
  onClose,
  onSave,
}: EditPostModalProps) {
  const { t } = useTranslation();
  const editorRef = useRef<PostEditorWrapperRef>(null);
  const { user } = useCurrentUser();

  /* ------------------------------------------------------- */
  /* STATE */
  /* ------------------------------------------------------- */

  const originalHTML = cleanHTML(post.content ?? "");

  const [title, setTitle] = useState(post.title || "");
  const [resetKey, setResetKey] = useState(0);
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [checking, setChecking] = useState(false);
  const [categoryReady, setCategoryReady] = useState(false);

  // ⭐ IMPORTANT: once changed → stays true until category check
  const [contentChanged, setContentChanged] = useState(false);

  const [visibleCount, setVisibleCount] = useState(5);
  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [animatingLayout, setAnimatingLayout] = useState(false);

  /* ------------------------------------------------------- */
  /* FETCH CATEGORIES */
  /* ------------------------------------------------------- */

  async function fetchCategories() {
    try {
      setLoadingCategories(true);
      const res = await fetch("/api/categories");
      const list = await res.json();

      const mapped: Category[] = list.map((c: any) => ({
        id: c._id,
        label: c.label,
        jname: c.jname ?? c.label,
        score: 0,
      }));

      setCategories(mapped);
    } catch (err) {
      console.error("❌ Failed to fetch categories:", err);
    } finally {
      setLoadingCategories(false);
      setCategoryReady(true);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!loadingCategories) {
      setSelected(post.categories?.map((c) => c.id) ?? []);
    }
  }, [loadingCategories, post.categories]);

  /* ------------------------------------------------------- */
  /* EDITOR UPDATE (FINAL SIMPLE LOGIC) */
  /* ------------------------------------------------------- */

  const handleEditorUpdate = () => {
    // ⭐ ANY edit → contentChanged = true
    setContentChanged(true);
  };

  /* ------------------------------------------------------- */
  /* CATEGORY CHECK */
  /* ------------------------------------------------------- */

  const handleCheckCategories = async () => {
    const html = editorRef.current?.getHTML() ?? "";
    const text = extractTextWithMath(html);

    if (!text.trim() && !title.trim()) {
      console.log("❌ No meaningful content for categorize");
      return;
    }

    const checkText = `title: ${title}\n${text}`;

    setChecking(true);
    setCategoryReady(false);
    setVisibleCount(5);
    setSelected([]);

    try {
      const res = await fetch("/api/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: checkText }),
      });

      if (!res.ok) throw new Error("Category check failed");

      const data: Category[] = await res.json();
      setCategories(data);
      setCategoryReady(true);

      // ⭐ Reset changed state AFTER successful check
      setContentChanged(false);
    } catch (err) {
      console.error("❌ Category check failed:", err);
      setCategoryReady(false);
    } finally {
      setChecking(false);
    }
  };

  /* ------------------------------------------------------- */
  /* SAVE */
  /* ------------------------------------------------------- */

  const handleSave = async () => {
    setSaving(true);

    const html = editorRef.current?.getHTML?.() ?? "";
    const tags = extractTagsFromHTML(html);

    try {
      await onSave(title.trim(), html.trim(), selected, tags);
      setResetKey((k) => k + 1);
      onClose();
    } catch (err) {
      console.error("❌ Edit save error:", err);
    } finally {
      setSaving(false);
    }
  };

  /* ------------------------------------------------------- */
  /* ORDERING */
  /* ------------------------------------------------------- */

  const ordered = [
    ...categories.filter((c) => selected.includes(c.id)),
    ...categories.filter((c) => !selected.includes(c.id)),
  ];

  const visibleCats = ordered.slice(0, visibleCount);

  /* ------------------------------------------------------- */
  /* RENDER */
  /* ------------------------------------------------------- */

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center 
                     bg-black/40 dark:bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25 }}
            className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-white 
                       dark:bg-neutral-900 rounded-2xl shadow-2xl 
                       border border-gray-200 dark:border-gray-700 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-xl font-semibold">{t("editPost")}</h2>
              <button
                onClick={onClose}
                className="text-xl text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            {/* BODY */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
              {/* TITLE */}
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
                  value={title}
                  maxLength={200}
                  placeholder={t("title")}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setContentChanged(true); // title also triggers check
                  }}
                  onFocus={() => setIsTitleFocused(true)}
                  onBlur={() => setIsTitleFocused(false)}
                  className="w-full text-xl px-3 py-3 bg-transparent focus:outline-none"
                />
              </motion.div>

              <p className="text-right text-xs text-gray-500 dark:text-gray-400">
                {title.length}/200
              </p>

              {/* EDITOR */}
              <div className="flex-1 overflow-y-auto rounded-md border dark:border-gray-700">
                <PostEditorWrapper
                  key={resetKey}
                  ref={editorRef}
                  value={originalHTML}
                  onUpdate={handleEditorUpdate}
                />
              </div>

              {/* CATEGORY SELECTOR */}
              <AnimatePresence>
                {!contentChanged && categoryReady && categories.length > 0 && (
                  <motion.div
                    key="cat-list"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-3"
                    onLayoutAnimationStart={() => setAnimatingLayout(true)}
                    onLayoutAnimationComplete={() => setAnimatingLayout(false)}
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
                          const isSelected = selected.includes(cat.id);

                          return (
                            <motion.div
                              key={cat.id}
                              layout
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.25 }}
                              className="flex flex-col"
                            >
                              <motion.button
                                type="button"
                                layout
                                whileTap={{ scale: 0.92 }}
                                whileHover={{ scale: 1.05 }}
                                onClick={() => {
                                  setSelected((prev) => {
                                    if (prev.includes(cat.id))
                                      return prev.filter((x) => x !== cat.id);
                                    if (prev.length >= 3) return prev;
                                    return [...prev, cat.id];
                                  });
                                }}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                                  isSelected
                                    ? "bg-blue-600 text-white shadow"
                                    : "bg-gray-200 dark:bg-gray-700"
                                }`}
                              >
                                {i18n.language === "ja" ? cat.jname : cat.label}
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

                    {!animatingLayout && (
                      <motion.div layout className="flex gap-4 text-sm">
                        {visibleCount < ordered.length && (
                          <button
                            type="button"
                            onClick={() => setVisibleCount((v) => v + 5)}
                            className="text-blue-500 hover:underline"
                          >
                            {t("showMore")}
                          </button>
                        )}

                        {visibleCount > 5 && (
                          <button
                            type="button"
                            onClick={() => setVisibleCount(5)}
                            className="text-blue-500 hover:underline"
                          >
                            {t("showLess")}
                          </button>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FOOTER */}
            <div className="border-t p-4 flex justify-between items-center bg-white dark:bg-neutral-900">
              <div className="flex items-center gap-2 text-sm">
                {user ? (
                  <img
                    src={`${user.picture}?t=${Date.now()}`}
                    className="w-8 h-8 rounded-full border border-gray-300 dark:border-neutral-700"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 dark:bg-neutral-700 rounded-full animate-pulse" />
                )}
                <span>
                  Editing as <strong>{user?.name}</strong>
                </span>
              </div>

              <div className="flex gap-3">
                {contentChanged || categories.length === 0 ? (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.03 }}
                    type="button"
                    disabled={checking}
                    onClick={handleCheckCategories}
                    className="px-6 py-2 rounded-lg bg-yellow-500 text-white disabled:bg-gray-400"
                  >
                    {checking ? "Checking..." : t("checkCategories")}
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.93 }}
                    whileHover={{ scale: 1.05 }}
                    type="button"
                    disabled={saving || selected.length === 0}
                    onClick={handleSave}
                    className="px-6 py-2 rounded-lg bg-blue-600 text-white disabled:bg-gray-400"
                  >
                    {saving ? "Saving..." : t("saveChanges")}
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
