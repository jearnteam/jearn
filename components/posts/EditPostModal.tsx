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
import { extractTagsFromHTML, extractTextWithMath, removeZWSP } from "@/lib/processText";

/* -------------------------------------------------------------------------- */
/*                                    TYPES                                   */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                               SHARED HELPERS                                */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/*                                 COMPONENT                                  */
/* -------------------------------------------------------------------------- */

export default function EditPostModal({
  post,
  onClose,
  onSave,
}: EditPostModalProps) {
  const { t } = useTranslation();
  const editorRef = useRef<PostEditorWrapperRef>(null);
  const { user } = useCurrentUser();

  /* -------------------------------------------------------------------------- */
  /*                                    STATE                                   */
  /* -------------------------------------------------------------------------- */

  const originalHTML = removeZWSP(post.content ?? "");

  const [title, setTitle] = useState(post.title || "");
  const [resetKey, setResetKey] = useState(0);

  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<string[]>(
    post.categories?.map((c) => c.id) ?? []
  );

  const [visibleCount, setVisibleCount] = useState(5);
  const [categoryReady, setCategoryReady] = useState(false);
  const [contentChanged, setContentChanged] = useState(true);

  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [animatingLayout, setAnimatingLayout] = useState(false);

  /* -------------------------------------------------------------------------- */
  /*                            FETCH ALL CATEGORIES                             */
  /* -------------------------------------------------------------------------- */

  useEffect(() => {
    (async () => {
      try {
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
      }
    })();
  }, []);

  /* -------------------------------------------------------------------------- */
  /*                               CONTENT CHANGE                                */
  /* -------------------------------------------------------------------------- */

  const handleEditorUpdate = () => {
    setContentChanged(true);
  };

  /* -------------------------------------------------------------------------- */
  /*                            CHECK CATEGORIES                                  */
  /* -------------------------------------------------------------------------- */

  const handleCheckCategories = async () => {
    let html = editorRef.current?.getHTML() ?? "";
    html = removeZWSP(html);

    const text = extractTextWithMath(html);

    if (!text.trim() && !title.trim()) {
      console.warn("❌ No content to categorize");
      return;
    }

    const checkText = `title: ${title}\n${text}`;

    setChecking(true);
    setCategoryReady(false);
    setSelected([]);
    setVisibleCount(5);

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
      setContentChanged(false); // ⭐ SAME AS POSTFORM
    } catch (err) {
      console.error("❌ Category check failed:", err);
    } finally {
      setChecking(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                                   SAVE                                     */
  /* -------------------------------------------------------------------------- */

  const handleSave = async () => {
    if (!title.trim()) return;
    if (selected.length === 0) return alert("Choose a category.");

    setSaving(true);

    let html = editorRef.current?.getHTML() ?? "";
    html = removeZWSP(html);

    const tags = extractTagsFromHTML(html);

    try {
      await onSave(title.trim(), html, selected, tags);

      setResetKey((k) => k + 1);
      setContentChanged(true);
      onClose();
    } catch (err) {
      console.error("❌ Edit save error:", err);
    } finally {
      setSaving(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /*                              CATEGORY ORDER                                 */
  /* -------------------------------------------------------------------------- */

  const ordered = [
    ...categories.filter((c) => selected.includes(c.id)),
    ...categories.filter((c) => !selected.includes(c.id)),
  ];

  const visibleCats = ordered.slice(0, visibleCount);

  /* -------------------------------------------------------------------------- */
  /*                                   RENDER                                   */
  /* -------------------------------------------------------------------------- */

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-white dark:bg-neutral-900 rounded-2xl border shadow-xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold">{t("editPost")}</h2>
              <button onClick={onClose}>✕</button>
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
                className={`rounded-lg border ${
                  isTitleFocused
                    ? "border-black dark:border-white"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                <input
                  value={title}
                  maxLength={200}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setContentChanged(true);
                  }}
                  onFocus={() => setIsTitleFocused(true)}
                  onBlur={() => setIsTitleFocused(false)}
                  className="w-full px-3 py-3 text-xl bg-transparent outline-none"
                />
              </motion.div>

              {/* EDITOR */}
              <PostEditorWrapper
                key={resetKey}
                ref={editorRef}
                value={originalHTML}
                onUpdate={handleEditorUpdate}
              />

              {/* CATEGORY LIST */}
              <AnimatePresence>
                {!contentChanged && categoryReady && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    className="space-y-3"
                    onLayoutAnimationStart={() => setAnimatingLayout(true)}
                    onLayoutAnimationComplete={() => setAnimatingLayout(false)}
                  >
                    <motion.div layout className="flex flex-wrap gap-3">
                      {visibleCats.map((cat) => {
                        const isSelected = selected.includes(cat.id);
                        return (
                          <motion.button
                            key={cat.id}
                            layout
                            whileTap={{ scale: 0.92 }}
                            whileHover={{ scale: 1.05 }}
                            onClick={() =>
                              setSelected((prev) =>
                                prev.includes(cat.id)
                                  ? prev.filter((x) => x !== cat.id)
                                  : prev.length < 3
                                  ? [...prev, cat.id]
                                  : prev
                              )
                            }
                            className={`px-4 py-1.5 rounded-full text-sm ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 dark:bg-gray-700"
                            }`}
                          >
                            {i18n.language === "ja"
                              ? cat.jname
                              : cat.label}
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FOOTER */}
            <div className="p-4 border-t flex justify-end">
              {categories.length === 0 || contentChanged ? (
                <button
                  disabled={checking}
                  onClick={handleCheckCategories}
                  className="px-6 py-2 bg-yellow-500 text-white rounded-lg"
                >
                  {checking ? "Checking..." : t("checkCategories")}
                </button>
              ) : (
                <button
                  disabled={saving}
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg"
                >
                  {saving ? "Saving..." : t("saveChanges")}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
}
