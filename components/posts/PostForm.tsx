"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import PostEditorWrapper, {
  PostEditorWrapperRef,
} from "@/components/posts/PostEditorWrapper";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import i18n from "@/lib/i18n";
import { PostType, PostTypes } from "@/types/post";
import {
  extractTagsFromHTML,
  extractTextWithMath,
  removeZWSP,
} from "@/lib/processText";

export interface PostFormData {
  postType: PostType;
  title: string;
  content: string;
  authorId: string | null;
  categories: string[];
  tags: string[];
}

export interface Category {
  id: string;
  label: string;
  jname: string;
  score: number;
}

export interface PostFormProps {
  mode: PostType;
  onSubmit: (data: PostFormData) => Promise<void>;

  initialTitle?: string;
  initialContent?: string;
  initialSelectedCategories?: string[];
  initialAvailableCategories?: Category[];
  submitLabel?: string;
  onCancel?: () => void;
}
// ✅ 修正点1: 空配列の参照を固定するための定数
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_STRING_ARRAY: string[] = [];

export default function PostForm({
  mode,
  onSubmit,
  initialTitle = "",
  initialContent = "",
  // ✅ 修正点2: デフォルト値を定数に置き換え
  initialSelectedCategories = EMPTY_STRING_ARRAY,
  initialAvailableCategories = EMPTY_CATEGORIES,
  submitLabel,
  onCancel,
}: PostFormProps) {
  const cleanInitialContent = removeZWSP(initialContent);

  const [title, setTitle] = useState(initialTitle);
  const [resetKey, setResetKey] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);

  const [categories, setCategories] = useState<Category[]>(
    initialAvailableCategories
  );
  const [selected, setSelected] = useState<string[]>(initialSelectedCategories);

  // コンテンツがある(編集時)なら変更なし(false)、なければ変更あり(true)
  const [contentChanged, setContentChanged] = useState(!initialContent);

  const [isTitleFocused, setIsTitleFocused] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [categoryReady, setCategoryReady] = useState(
    initialAvailableCategories.length > 0
  );

  const [animatingLayout, setAnimatingLayout] = useState(false);

  const editorRef = useRef<PostEditorWrapperRef>(null);
  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();

  const authorId = user?._id || null;

  // ✅ 修正点3: 依存配列の問題が解消され、無限ループしなくなります
  useEffect(() => {
    setTitle(initialTitle);
    setSelected(initialSelectedCategories);
    setCategories(initialAvailableCategories);
    setCategoryReady(initialAvailableCategories.length > 0);
    setContentChanged(!initialContent);
    // エディタのリセット
    setResetKey((k) => k + 1);
  }, [
    initialTitle,
    initialContent,
    initialSelectedCategories,
    initialAvailableCategories,
  ]);

  /* -------------------------------------------------------------------------- */
  /* CHECK CATEGORIES                              */
  /* -------------------------------------------------------------------------- */
  const handleCheckCategories = async () => {
    if (mode === PostTypes.ANSWER) return;

    let html = editorRef.current?.getHTML() ?? "";
    html = removeZWSP(html);

    const text = extractTextWithMath(html);

    if (!text.trim() && !title.trim()) {
      console.log("❌ No content to categorize");
      return;
    }

    const checkText = `title: ${title}\n${text}`;

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
        body: JSON.stringify({ content: checkText }),
      });

      if (!res.ok) throw new Error("Categorization failed");

      const data: Category[] = await res.json();

      setCategories([...data]);
      setCategoryReady(true);
    } catch (err) {
      console.error("❌ Category check failed:", err);
      setCategoryReady(false);
    } finally {
      setChecking(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* CONTENT CHANGE                                */
  /* -------------------------------------------------------------------------- */
  const handleEditorUpdate = () => {
    setContentChanged(true);
  };

  /* -------------------------------------------------------------------------- */
  /* CATEGORY SELECTOR                                */
  /* -------------------------------------------------------------------------- */
  const handleSelectCategory = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  /* -------------------------------------------------------------------------- */
  /* SUBMIT                                   */
  /* -------------------------------------------------------------------------- */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode !== PostTypes.ANSWER && !title.trim()) return;
    if (mode !== PostTypes.ANSWER && selected.length === 0)
      return alert("Choose a category.");

    let html = editorRef.current?.getHTML() ?? "";
    html = removeZWSP(html);

    const tags = extractTagsFromHTML(html);

    setSubmitting(true);
    try {
      await onSubmit({
        postType: mode,
        title,
        content: html,
        authorId,
        categories: selected,
        tags,
      });

      // 新規作成時のみフォームをクリア
      if (!initialContent) {
        editorRef.current?.clearEditor();
        setCategories([]);
        setSelected([]);
        setTitle("");
        setResetKey((k) => k + 1);
        setContentChanged(true);
      }
    } catch (err) {
      console.error("❌ Error posting:", err);
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------------------------------------------------------------- */
  /* CATEGORY ORDER                                */
  /* -------------------------------------------------------------------------- */
  const ordered = [
    ...categories.filter((c) => selected.includes(c.id)),
    ...categories.filter((c) => !selected.includes(c.id)),
  ];

  const visibleCats = ordered.slice(0, visibleCount);

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col h-full space-y-4 bg-white dark:bg-neutral-900 p-4 rounded-lg"
    >
      {/* ------------------------------ Title ------------------------------ */}
      {mode !== PostTypes.ANSWER && (
        <>
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
              placeholder={
                mode === PostTypes.QUESTION
                  ? t("questionEnter") || "Question"
                  : t("title") || "Title"
              }
              value={title}
              maxLength={200}
              onChange={(e) => {
                setTitle(e.target.value);
                setContentChanged(true);
              }}
              onFocus={() => setIsTitleFocused(true)}
              onBlur={() => setIsTitleFocused(false)}
              className="w-full text-xl px-2 py-3 bg-transparent focus:outline-none"
              autoComplete="off"
            />
          </motion.div>
          <p className="text-right text-xs text-gray-500 dark:text-gray-400 px-1 pb-1">
            {title.length}/200
          </p>
        </>
      )}

      {/* ------------------------------ Editor ------------------------------ */}
      <div className="flex-1 overflow-y-auto rounded-md">
        <PostEditorWrapper
          key={`${resetKey}-${mode}`}
          ref={editorRef}
          value={cleanInitialContent}
          onUpdate={handleEditorUpdate}
          // placeholderはオプション
        />
      </div>

      {/* ------------------------------ Categories ------------------------------ */}
      <AnimatePresence>
        {(!contentChanged || initialAvailableCategories.length > 0) &&
          categoryReady &&
          categories.length > 0 &&
          mode !== PostTypes.ANSWER && (
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
                  transition={{ layout: { duration: 0.35, ease: "easeInOut" } }}
                >
                  {visibleCats.map((cat) => {
                    const isSelected = selected.includes(cat.id);
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
                          type="button"
                          layout
                          whileTap={{ scale: 0.92 }}
                          whileHover={{ scale: 1.05 }}
                          onClick={() => handleSelectCategory(cat.id)}
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
                      {t("showMore") || "Show more"}
                    </button>
                  )}
                  {visibleCount > 5 && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount(5)}
                      className="text-blue-500 hover:underline"
                    >
                      {t("showLess") || "Show less"}
                    </button>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
      </AnimatePresence>

      {/* ------------------------------ Footer ------------------------------ */}
      <div className="sticky bottom-0 bg-white dark:bg-neutral-900 border-t dark:border-gray-700 pt-3 pb-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm">
            {user ? (
              <img
                src={`${user.picture}?t=${Date.now()}`}
                className="w-8 h-8 rounded-full border border-gray-300 dark:border-neutral-700"
              />
            ) : (
              <div className="w-8 h-8 bg-gray-300 dark:bg-neutral-700 animate-pulse rounded-full" />
            )}
            <span className="hidden sm:inline">{user?.name}</span>
          </div>

          <div className="flex gap-3 items-center">
            {/* Cancel Button */}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                {t("cancel") || "Cancel"}
              </button>
            )}

            {/* Image Upload Button */}
            <button
              type="button"
              onClick={async () => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = async () => {
                  const file = input.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append("file", file);
                  const res = await fetch("/api/images/uploadImage", {
                    method: "POST",
                    body: form,
                  });
                  const { id, url, width, height } = await res.json();
                  editorRef.current?.editor
                    ?.chain()
                    .focus()
                    .insertImagePlaceholder(id, url, width, height)
                    .run();
                };
                input.click();
              }}
              className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              🖼️
            </button>

            {/* Submit / Check Categories Button */}
            {(categories.length === 0 || contentChanged) &&
            mode !== PostTypes.ANSWER ? (
              <motion.button
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.03 }}
                type="button"
                disabled={checking}
                onClick={handleCheckCategories}
                className="px-6 py-2 rounded-lg bg-yellow-500 text-white disabled:bg-gray-400 transition"
              >
                {checking
                  ? "Checking..."
                  : t("checkCategories") || "Check Categories"}
              </motion.button>
            ) : (
              <motion.button
                whileTap={{ scale: 0.93 }}
                whileHover={{ scale: 1.05 }}
                type="submit"
                disabled={
                  submitting ||
                  loading ||
                  (mode !== PostTypes.ANSWER && selected.length === 0)
                }
                className={`px-6 py-2 rounded-lg text-white disabled:bg-gray-400 transition
                  ${
                    mode === PostTypes.QUESTION
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-blue-600 hover:bg-blue-700"
                  }
                `}
              >
                {submitting
                  ? "Processing..."
                  : submitLabel ||
                    (mode === PostTypes.QUESTION
                      ? "Ask Question"
                      : mode === PostTypes.ANSWER
                      ? "Answer"
                      : t("submit") || "Submit")}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.form>
  );
}
