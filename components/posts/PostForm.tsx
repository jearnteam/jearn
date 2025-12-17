"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import PostEditorWrapper, {
  PostEditorWrapperRef,
} from "@/components/posts/PostEditorWrapper";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import i18n from "@/lib/i18n";
import { PostType, PostTypes } from "@/types/post";

export interface PostFormProps {
  onSubmit: (
    postType: PostType,
    title: string,
    content: string,
    authorId: string | null,
    categories: string[],
    tags: string[]
  ) => Promise<void>;
  mode?: "post" | "question";
}

interface Category {
  id: string;
  label: string;
  jname: string;
  score: number;
}

/* -------------------------------------------------------------------------- */
/*                       REMOVE ZERO-WIDTH-SPACE (ZWSP)                       */
/* -------------------------------------------------------------------------- */
function removeZWSP(html: string): string {
  return html.replace(/\u200B/g, "");
}

/* -------------------------------------------------------------------------- */
/*                              TAG EXTRACTION                                 */
/* -------------------------------------------------------------------------- */
function extractTagsFromHTML(html: string): string[] {
  const div = document.createElement("div");
  div.innerHTML = html;

  const tags = Array.from(div.querySelectorAll("a[data-type='tag']"))
    .map((a) => a.getAttribute("data-value") || "")
    .filter(Boolean);

  return Array.from(new Set(tags)); // unique tags
}

export default function PostForm({ onSubmit, mode = "post" }: PostFormProps) {
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

  const [animatingLayout, setAnimatingLayout] = useState(false);

  const editorRef = useRef<PostEditorWrapperRef>(null);
  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();

  const authorId = user?._id || null;

  /* -------------------------------------------------------------------------- */
  /*                              CHECK CATEGORIES                              */
  /* -------------------------------------------------------------------------- */

  function extractTextWithMath(html: string): string {
    const div = document.createElement("div");
    div.innerHTML = html;

    let text = "";

    function walk(node: Node) {
      if (!node) return;

      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent ?? "";
        return;
      }

      if (node instanceof HTMLElement && node.dataset.type === "math") {
        const latex =
          node.getAttribute("latex") || node.getAttribute("data-latex") || "";
        if (latex) text += latex + " ";
        return;
      }

      node.childNodes.forEach(walk);
    }

    walk(div);

    return text.replace(/\s+/g, " ").trim();
  }

  const handleCheckCategories = async () => {
    let html = editorRef.current?.getHTML() ?? "";

    // ⭐ Remove ZWSP (Important)
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
  /*                              CONTENT CHANGE                                 */
  /* -------------------------------------------------------------------------- */

  const handleEditorUpdate = () => {
    setContentChanged(true);
  };

  /* -------------------------------------------------------------------------- */
  /*                           CATEGORY SELECTOR                                 */
  /* -------------------------------------------------------------------------- */

  const handleSelectCategory = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  /* -------------------------------------------------------------------------- */
  /*                                   SUBMIT                                    */
  /* -------------------------------------------------------------------------- */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;
    if (selected.length === 0) return alert("Choose a category.");

    let html = editorRef.current?.getHTML() ?? "";

    // ⭐ Remove ZWSP before saving
    html = removeZWSP(html);

    // Extract tags from clean HTML
    const tags = extractTagsFromHTML(html);
    console.log("Extracted tags:", tags);

    setSubmitting(true);
    try {
      await onSubmit(
        mode === "question" ? PostTypes.QUESTION : PostTypes.POST,
        title,
        html,
        authorId,
        selected,
        tags
      );

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
  /*                              CATEGORY ORDER                                 */
  /* -------------------------------------------------------------------------- */

  const ordered = [
    ...categories.filter((c) => selected.includes(c.id)),
    ...categories.filter((c) => !selected.includes(c.id)),
  ];

  const visibleCats = ordered.slice(0, visibleCount);

  /* -------------------------------------------------------------------------- */
  /*                                   RENDER                                    */
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
          placeholder={
            mode === "question"
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

      {/* Character count */}
      <p className="text-right text-xs text-gray-500 dark:text-gray-400 px-1 pb-1">
        {title.length}/200
      </p>

      {/* ------------------------------ Editor ------------------------------ */}
      <div className="flex-1 overflow-y-auto rounded-md">
        <PostEditorWrapper
          key={`${resetKey}-${mode}`} // ⭐ mode を含める
          ref={editorRef}
          value=""
          onUpdate={handleEditorUpdate}
          placeholder={
            mode === "question"
              ? "質問内容を詳しく書いてください"
              : t("placeholder") || "Placeholder"
          }
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

            {/* Show More / Show Less */}
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
            <span>
              {t("postingAsBefore") ?? "Posting as"}{" "}
              {user ? (
                <strong>{user.name}</strong>
              ) : (
                <span className="inline-block w-24 h-5 bg-gray-300 dark:bg-neutral-700 animate-pulse rounded-md"></span>
              )}{" "}
              {t("postingAsAfter") ?? ""}
            </span>
          </div>

          <div className="flex gap-3 items-center">
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

                  const res = await fetch("//uplapi/imagesoadImage", {
                    method: "POST",
                    body: form,
                  });

                  const { id, url, width, height } = await res.json();

                  // ⭐ editor に画像挿入
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

            {categories.length === 0 || contentChanged ? (
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
                disabled={submitting || loading || selected.length === 0}
                className={`px-6 py-2 rounded-lg text-white disabled:bg-gray-400 transition
    ${
      mode === "question"
        ? "bg-orange-500 hover:bg-orange-600"
        : "bg-blue-600 hover:bg-blue-700"
    }
  `}
              >
                {submitting
                  ? mode === "question"
                    ? "Submitting Question..."
                    : "Submitting..."
                  : mode === "question"
                  ? "Ask Question"
                  : t("submit") || "Submit"}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.form>
  );
}
