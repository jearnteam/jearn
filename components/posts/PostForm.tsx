"use client";

import { useState, useRef, useEffect, useMemo } from "react";
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
import { useUpload } from "@/components/upload/UploadContext";
import { xhrUpload } from "@/lib/xhrUpload";
import {
  loadDraft,
  saveDraft,
  clearDraft,
  type PostDraftRecord,
} from "@/lib/postDraft";

export interface PostFormData {
  postType: PostType;
  questionId?: string;
  title: string;
  content: string;
  authorId: string | null;
  categories: string[];
  tags: string[];
  video?: {
    url: string;
    thumbnailUrl?: string;
    duration?: number;
    aspectRatio?: number;
  };
}

export interface Category {
  id: string;
  label: string;
  jname?: string;
  myname?: string;
  score: number;
}

export interface PostFormProps {
  mode: PostType;
  questionId?: string;
  onSubmit: (data: PostFormData) => Promise<void>;

  initialTitle?: string;
  initialContent?: string;
  initialSelectedCategories?: string[];
  initialAvailableCategories?: Category[];
  submitLabel?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}
// ✅ 修正点1: 空配列の参照を固定するための定数
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_STRING_ARRAY: string[] = [];

export default function PostForm({
  mode,
  questionId,
  onSubmit,
  initialTitle = "",
  initialContent = "",
  // ✅ 修正点2: デフォルト値を定数に置き換え
  initialSelectedCategories = EMPTY_STRING_ARRAY,
  initialAvailableCategories = EMPTY_CATEGORIES,
  onSuccess,
  onCancel,
}: PostFormProps) {
  const [title, setTitle] = useState(initialTitle);

  const editorRef = useRef<PostEditorWrapperRef>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const editorReadyRef = useRef(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const clearUndoRef = useRef<ClearSnapshot | null>(null);
  const clearRedoRef = useRef<ClearSnapshot | null>(null);
  const editorHostRef = useRef<HTMLDivElement>(null);
  const lastFocusedAreaRef = useRef<FocusArea>("none");

  type ClearSnapshot = {
    title: string;
    content: string;
  };

  type FocusArea = "title" | "editor" | "none";

  const getFocusArea = (): FocusArea => {
    const active = document.activeElement;

    if (active && titleInputRef.current && active === titleInputRef.current) {
      lastFocusedAreaRef.current = "title";
      return "title";
    }

    if (
      active &&
      editorHostRef.current &&
      editorHostRef.current.contains(active)
    ) {
      lastFocusedAreaRef.current = "editor";
      return "editor";
    }

    // 🔑 fallback for keyboard undo
    return lastFocusedAreaRef.current;
  };
  const suppressTitleBlurRef = useRef(false);
  const refocus = (area: FocusArea) => {
    requestAnimationFrame(() => {
      if (area === "title") {
        const input = titleInputRef.current;
        if (!input) return;

        suppressTitleBlurRef.current = true;

        input.focus();

        const len = input.value.length;
        input.setSelectionRange(len, len);

        requestAnimationFrame(() => {
          suppressTitleBlurRef.current = false;
        });
      }

      if (area === "editor") {
        editorRef.current?.focus();
      }
    });
  };

  const titleHistoryRef = useRef<string[]>([]);
  const titleRedoRef = useRef<string[]>([]);

  const [editorInitialHTML, setEditorInitialHTML] = useState<string>(
    removeZWSP(initialContent || "<p></p>")
  );

  const [footerHeight, setFooterHeight] = useState(0);
  const pendingImagesRef = useRef<Map<string, File>>(new Map());
  const localBlobUrlsRef = useRef<Map<string, string>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);

  const videoFileRef = useRef<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const thumbnailFileRef = useRef<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(
    null
  );

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
  const upload = useUpload();
  const { progress, stage } = useUpload();
  const label =
    stage === "uploading"
      ? "Uploading files…"
      : stage === "processing"
      ? "Processing post…"
      : stage === "done"
      ? "Done"
      : "";

  const [animatingLayout, setAnimatingLayout] = useState(false);

  const { user, loading } = useCurrentUser();
  const { t } = useTranslation();

  const authorId = user?._id || null;
  const lastTitleChangeAtRef = useRef<number>(0);
  const TITLE_UNDO_THRESHOLD = 300;

  const draftKey = useMemo(() => {
    if (!user?._id) return null;
    return `${user._id}:${mode}:${
      mode === PostTypes.ANSWER ? questionId ?? "" : ""
    }`;
  }, [user?._id, mode, questionId]);
  const editorKey = useMemo(() => {
    if (!user?._id) return "anon";
    return `editor:${draftKey}`;
  }, [draftKey]);

  const draftReadyRef = useRef(false);

  const getDraftScope = () => ({
    userId: user!._id,
    postType: mode,
    questionId: mode === PostTypes.ANSWER ? questionId : undefined,
  });

  const getSanitizedEditorHTML = () => {
    if (!editorRef.current) return "<p></p>";

    const html = removeZWSP(editorRef.current.getHTML());
    const doc = new DOMParser().parseFromString(html, "text/html");

    doc
      .querySelectorAll("img[data-type='image-placeholder']")
      .forEach((img) => {
        img.removeAttribute("src"); // 🔥 prevent blob persistence
      });

    return doc.body.innerHTML;
  };
  const saveDraftNow = async (nextTitle?: string) => {
    if (!user?._id) return;
    if (!editorRef.current) return;
    if (!editorReadyRef.current) return;

    const content = getSanitizedEditorHTML();
    const { userId, postType, questionId } = getDraftScope();

    const images = await Promise.all(
      Array.from(pendingImagesRef.current.entries()).map(
        async ([id, file]) => ({
          id,
          buffer: await file.arrayBuffer(),
          mime: file.type,
        })
      )
    );

    saveDraft(
      userId,
      postType,
      {
        title: (nextTitle ?? title).trim(),
        content,
        images,
      },
      questionId
    );
  };

  function collectUsedImageIds(html: string): Set<string> {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const ids = new Set<string>();

    doc
      .querySelectorAll("img[data-type='image-placeholder'][data-id]")
      .forEach((img) => {
        const id = img.getAttribute("data-id");
        if (id) ids.add(id);
      });

    return ids;
  }

  function gcDraftImages(draft: PostDraftRecord): PostDraftRecord {
    const usedIds = collectUsedImageIds(draft.content);

    if (draft.images.length === 0) return draft;

    const filteredImages = draft.images.filter((img) => usedIds.has(img.id));

    // nothing to clean
    if (filteredImages.length === draft.images.length) {
      return draft;
    }

    return {
      ...draft,
      images: filteredImages,
      updatedAt: Date.now(),
    };
  }

  // ✅ 修正点3: 依存配列の問題が解消され、無限ループしなくなります

  const pendingDraftRef = useRef<PostDraftRecord | null>(null);
  const lastLoadedDraftKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?._id || !draftKey) return;
    if (lastLoadedDraftKeyRef.current === draftKey) return;

    lastLoadedDraftKeyRef.current = draftKey;

    const init = async () => {
      const { userId, postType, questionId } = getDraftScope();
      const rawDraft = await loadDraft(userId, postType, questionId);

      if (rawDraft) {
        // ✅ GC only here
        const cleanedDraft = gcDraftImages(rawDraft);

        // persist cleaned version once
        if (cleanedDraft !== rawDraft) {
          await saveDraft(
            userId,
            postType,
            {
              title: cleanedDraft.title,
              content: cleanedDraft.content,
              images: cleanedDraft.images,
            },
            questionId
          );
        }

        pendingDraftRef.current = cleanedDraft;
        setTitle(cleanedDraft.title);
      } else {
        pendingDraftRef.current = {
          key: "__empty__",
          postType: mode,
          title: initialTitle,
          content: removeZWSP(initialContent || "<p></p>"),
          images: [],
          updatedAt: Date.now(),
        };
        setTitle(initialTitle);
      }

      setSelected(initialSelectedCategories);
      setCategories(initialAvailableCategories);
      setCategoryReady(initialAvailableCategories.length > 0);
    };

    init();
  }, [draftKey]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (thumbnailPreviewUrl) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [videoPreviewUrl, thumbnailPreviewUrl]);

  useEffect(() => {
    if (!footerRef.current) return;

    const update = () => {
      setFooterHeight(footerRef.current!.offsetHeight);
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;

      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    editorReadyRef.current = false;
    draftReadyRef.current = false;
  }, [mode, questionId]);

  /* -------------------------------------------------------------------------- */
  /* CHECK CATEGORIES                              */
  /* -------------------------------------------------------------------------- */
  const handleCheckCategories = async () => {
    if (mode === PostTypes.ANSWER) return;

    let html = editorRef.current?.getHTML() ?? "";
    html = removeZWSP(html);

    const text = extractTextWithMath(html).trim();
    const hasMedia =
      html.includes("<img") ||
      html.includes("<video") ||
      html.includes("math-inline") ||
      html.includes("math-block");

    if (!text && !hasMedia && !title.trim()) return;

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

      const data = await res.json();

      const preds = Array.isArray(data) ? data : data.predictions;

      if (!Array.isArray(preds)) {
        throw new Error("Invalid AI format");
      }

      setCategories(preds);
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

  const isApplyingUndoRedoRef = useRef(false);
  const handleEditorUpdate = () => {
    if (!editorRef.current) return;
    if (isApplyingUndoRedoRef.current) return;

    const html = removeZWSP(editorRef.current.getHTML());
    const hasMeaningfulContent =
      extractTextWithMath(html).trim().length > 0 ||
      html.includes("<img") ||
      html.includes("<video") ||
      html.includes("math-inline") ||
      html.includes("math-block");
    saveDraftNow(title);

    if (mode !== PostTypes.QUESTION && !hasMeaningfulContent) return;

    setContentChanged(true);
  };
  const clearModeRef = useRef(false);
  const handleClearContent = () => {
    const editor = editorRef.current?.editor;
    if (!editor) return;

    const content = editor.getHTML();

    clearUndoRef.current = { title, content };
    clearRedoRef.current = null;

    clearModeRef.current = true; // 🔒 lock undo mode

    editorRef.current?.clearWithHistory();
    setTitle("");
    setContentChanged(true);

    (document.activeElement as HTMLElement | null)?.blur();

    if (authorId) {
      clearDraft(
        authorId,
        mode,
        mode === PostTypes.ANSWER ? questionId : undefined
      );
    }
  };

  const handleUndo = () => {
    const area = getFocusArea();

    // 🔒 CLEAR MODE: only atomic clear undo allowed
    if (clearModeRef.current) {
      if (!clearUndoRef.current) return;

      const snap = clearUndoRef.current;
      clearUndoRef.current = null;

      clearRedoRef.current = {
        title,
        content: editorRef.current?.getHTML() ?? "<p></p>",
      };

      isApplyingUndoRedoRef.current = true;
      editorRef.current?.editor?.commands.setContent(snap.content, {
        emitUpdate: false,
      });
      isApplyingUndoRedoRef.current = false;

      setTitle(snap.title);
      saveDraftNow(snap.title);

      requestAnimationFrame(() => {
        (document.activeElement as HTMLElement | null)?.blur();
        lastFocusedAreaRef.current = "none";
      });

      return;
    }

    // 1️⃣ Title undo
    if (area === "title") {
      const history = titleHistoryRef.current;

      // ✅ drop duplicates of current
      while (history.length && history[history.length - 1] === title) {
        history.pop();
      }

      const prev = history.pop();
      if (prev === undefined) return;

      titleRedoRef.current.push(title);

      isApplyingUndoRedoRef.current = true;
      setTitle(prev);
      isApplyingUndoRedoRef.current = false;

      refocus("title");
      return;
    }

    // 2️⃣ Editor undo
    if (area === "editor") {
      if (!editorRef.current?.editor?.can().undo()) return;

      isApplyingUndoRedoRef.current = true;
      editorRef.current?.editor?.commands.undo();
      isApplyingUndoRedoRef.current = false;
      refocus("editor");
      return;
    }
  };

  const handleRedo = () => {
    const area = getFocusArea();

    // 🔒 CLEAR MODE: only atomic re-clear allowed
    if (clearModeRef.current) {
      if (!clearRedoRef.current) return;

      const snap = clearRedoRef.current;
      clearRedoRef.current = null;

      clearUndoRef.current = {
        title,
        content: editorRef.current?.getHTML() ?? "<p></p>",
      };

      isApplyingUndoRedoRef.current = true;
      editorRef.current?.editor?.commands.setContent(snap.content, {
        emitUpdate: false,
      });
      isApplyingUndoRedoRef.current = false;

      setTitle(snap.title);
      saveDraftNow(snap.title);

      requestAnimationFrame(() => {
        (document.activeElement as HTMLElement | null)?.blur();
        lastFocusedAreaRef.current = "none";
      });

      return;
    }

    // 1️⃣ Title redo
    if (area === "title") {
      const redo = titleRedoRef.current;
      if (redo.length === 0) return;

      const next = redo.pop()!;
      titleHistoryRef.current.push(title);

      isApplyingUndoRedoRef.current = true;
      setTitle(next);
      isApplyingUndoRedoRef.current = false;

      refocus("title");
      return;
    }

    // 2️⃣ Editor redo
    if (area === "editor") {
      if (!editorRef.current?.editor?.can().redo()) return;

      isApplyingUndoRedoRef.current = true;
      editorRef.current?.editor?.commands.redo();
      isApplyingUndoRedoRef.current = false;
      refocus("editor");
      return;
    }
  };

  const suppressBlurOnce = () => {
    suppressTitleBlurRef.current = true;
    requestAnimationFrame(() => {
      suppressTitleBlurRef.current = false;
    });
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

    if (mode !== PostTypes.ANSWER && !title.trim()) {
      alert("Title / description is required.");
      return;
    }

    if (mode !== PostTypes.ANSWER && selected.length === 0) {
      alert("Choose a category.");
      return;
    }

    if (mode === PostTypes.VIDEO && !videoFileRef.current) {
      alert("Please upload a video.");
      return;
    }

    upload.start();
    setSubmitting(true);

    onSuccess?.();

    try {
      let html = editorRef.current?.getHTML() ?? "";
      html = removeZWSP(html);

      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");

      const images = Array.from(
        doc.querySelectorAll(
          "img[data-type='image-placeholder'][data-status='local']"
        )
      );

      // 🖼 Image uploads (XHR)
      for (const img of images) {
        const localId = img.getAttribute("data-id");
        if (!localId) continue;

        const file = pendingImagesRef.current.get(localId);
        if (!file) continue;

        const form = new FormData();
        form.append("file", file);

        const uploaded = await xhrUpload("/api/media/upload", form, (p) =>
          upload.setUploading(p)
        );

        if (!uploaded?.url) throw new Error("Image upload failed");

        img.setAttribute("src", uploaded.url);
        img.removeAttribute("data-status");

        const blobUrl = localBlobUrlsRef.current.get(localId);
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      }

      html = doc.body.innerHTML;
      const tags = extractTagsFromHTML(html);

      let video;

      if (mode === PostTypes.VIDEO && videoFileRef.current) {
        const form = new FormData();
        form.append("file", videoFileRef.current);

        if (thumbnailFileRef.current) {
          form.append("thumbnail", thumbnailFileRef.current);
        }

        video = await xhrUpload("/api/media/upload/video", form, (p) =>
          upload.setUploading(p)
        );

        if (!video?.url) throw new Error("Video upload failed");
      }

      upload.setProcessing();

      await onSubmit({
        postType: mode,
        title,
        content: html,
        authorId,
        categories: selected,
        tags,
        video,
      });

      // CLEAR DRAFT
      if (authorId) {
        clearDraft(
          authorId,
          mode,
          mode === PostTypes.ANSWER ? questionId : undefined
        );
      }
      upload.finish();
    } catch (err) {
      console.error("❌ Error posting:", err);
      upload.finish();
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

  const avatarUrl = useMemo(() => {
    if (!user) return null;

    const updatedAt = user.avatarUpdatedAt
      ? new Date(user.avatarUpdatedAt).getTime()
      : "";

    return updatedAt ? `${user.picture}?t=${updatedAt}` : user.picture;
  }, [user?.picture, user?.avatarUpdatedAt]);

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col min-h-0 bg-white dark:bg-neutral-900 rounded-lg"
    >
      {/* ================= SCROLL AREA ================= */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
              ref={titleInputRef}
              type="text"
              placeholder={
                mode === PostTypes.VIDEO
                  ? "Add a description"
                  : mode === PostTypes.QUESTION
                  ? t("questionEnter") || "Question"
                  : t("title") || "Title"
              }
              value={title}
              maxLength={200}
              onChange={(e) => {
                if (isApplyingUndoRedoRef.current) {
                  setTitle(e.target.value);
                  return;
                }

                const next = e.target.value;
                const now = Date.now();

                if (now - lastTitleChangeAtRef.current > TITLE_UNDO_THRESHOLD) {
                  titleHistoryRef.current.push(title);
                }

                lastTitleChangeAtRef.current = now;
                titleRedoRef.current.length = 0;

                setTitle(next);
                setContentChanged(true);
                saveDraftNow(next);
              }}
              onFocus={() => {
                clearModeRef.current = false; // 🔓 unlock
                lastFocusedAreaRef.current = "title";
                setIsTitleFocused(true);
              }}
              onBlur={() => {
                setIsTitleFocused(false);

                // ✅ ignore blur caused by undo/redo buttons (mousedown) or programmatic ops
                if (
                  suppressTitleBlurRef.current ||
                  isApplyingUndoRedoRef.current
                )
                  return;

                const hist = titleHistoryRef.current;
                if (hist.length === 0 || hist[hist.length - 1] !== title) {
                  hist.push(title);
                }
              }}
              className="w-full text-xl px-2 py-3 bg-transparent focus:outline-none"
              autoComplete="off"
            />
          </motion.div>
          <p className="text-right text-xs text-gray-500 dark:text-gray-400 px-1 pb-1">
            {title.length}/200
          </p>
        </>

        {/* ------------------------------ Editor ------------------------------ */}
        <div ref={editorHostRef} className="overflow-visible rounded-md">
          <PostEditorWrapper
            key={editorKey}
            ref={editorRef}
            onUpdate={handleEditorUpdate}
            initialValue="<p></p>"
            onReady={() => {
              const draft = pendingDraftRef.current;
              if (!draft) return;

              // 1️⃣ Restore document structure
              editorRef.current?.editor?.commands.setContent(draft.content, {
                emitUpdate: false,
              });

              // 2️⃣ Defer image hydration until DOM exists
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  draft.images.forEach(({ id, buffer, mime }) => {
                    const blob = new Blob([buffer], { type: mime });
                    const file = new File([blob], "image", { type: mime });
                    const url = URL.createObjectURL(blob);

                    const img = editorHostRef.current?.querySelector(
                      `img[data-type="image-placeholder"][data-id="${id}"]`
                    ) as HTMLImageElement | null;

                    if (!img) return;

                    img.src = url;
                    img.setAttribute("data-status", "local");

                    pendingImagesRef.current.set(id, file);
                    localBlobUrlsRef.current.set(id, url);
                  });

                  pendingDraftRef.current = null;
                  editorReadyRef.current = true;
                });
              });
            }}
            onFocus={() => {
              clearModeRef.current = false; // 🔓 unlock
              lastFocusedAreaRef.current = "editor";
              setIsTitleFocused(false);
            }}
            placeholder={
              mode === PostTypes.POST
                ? t("placeholder") || "Placeholder"
                : mode === PostTypes.QUESTION
                ? "質問内容を詳しく書いてください"
                : mode === PostTypes.ANSWER
                ? "Answer"
                : "Placeholder(Illegal Statement)"
            }
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

          {mode === PostTypes.VIDEO && (
            <div className="space-y-4">
              {/* 🎥 Video Preview */}
              {videoPreviewUrl ? (
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full max-h-[360px] rounded-lg bg-black"
                />
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center text-gray-500">
                  No video selected
                </div>
              )}

              {/* 🎥 Select Video */}
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "video/*";

                  input.onchange = () => {
                    const file = input.files?.[0];
                    if (!file) return;

                    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);

                    videoFileRef.current = file;
                    setVideoPreviewUrl(URL.createObjectURL(file));
                  };

                  input.click();
                }}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
              >
                Select Video
              </button>

              {/* 🖼 Thumbnail Preview */}
              {thumbnailPreviewUrl ? (
                <img
                  src={thumbnailPreviewUrl}
                  alt="Thumbnail preview"
                  className="w-full max-h-[200px] object-cover rounded-lg border"
                />
              ) : (
                <div className="text-sm text-gray-500">
                  If the thumbnail is not selected, first frame will be used
                </div>
              )}

              {/* 🖼 Select Thumbnail */}
              <button
                type="button"
                onClick={() => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";

                  input.onchange = () => {
                    const file = input.files?.[0];
                    if (!file) return;

                    if (thumbnailPreviewUrl)
                      URL.revokeObjectURL(thumbnailPreviewUrl);

                    thumbnailFileRef.current = file;
                    setThumbnailPreviewUrl(URL.createObjectURL(file));
                  };

                  input.click();
                }}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700 transition"
              >
                Select Thumbnail
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* ------------------------------ Footer ------------------------------ */}
      <div ref={footerRef} className="sticky b-0 p-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm">
            {user ? (
              <img
                src={avatarUrl!}
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
            {/* Undo Button */}
            <button
              type="button"
              onMouseDown={suppressBlurOnce}
              onClick={handleUndo}
              className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300
             dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition"
              title="Undo (Ctrl/Cmd + Z)"
            >
              ↩️
            </button>

            {/* Redo Button */}
            <button
              type="button"
              onMouseDown={suppressBlurOnce}
              onClick={handleRedo}
              className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300
             dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition"
              title="Redo (Ctrl/Cmd + Shift + Z)"
            >
              ↪️
            </button>

            {/* Clear Content Button */}
            <button
              type="button"
              onClick={handleClearContent}
              className="px-3 py-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200
             dark:bg-red-900/30 dark:text-red-400 transition"
              title="Clear title and content"
            >
              🗑️
            </button>

            {/* Image Upload Button */}
            {mode !== PostTypes.VIDEO && (
              <button
                type="button"
                onClick={async () => {
                  const input = document.createElement("input");
                  input.type = "file";
                  input.accept = "image/*";

                  input.onchange = async () => {
                    const file = input.files?.[0];
                    if (!file) return;

                    // 🔹 create local preview
                    const localUrl = URL.createObjectURL(file);
                    const localId = crypto.randomUUID();

                    // 🔹 INSERT PREVIEW ONLY (NO UPLOAD)
                    editorRef.current?.editor
                      ?.chain()
                      .focus()
                      .insertImagePlaceholder(localId, localUrl)
                      .run();

                    // 🔑 mark image as local AFTER insertion
                    requestAnimationFrame(() => {
                      const editorEl = editorHostRef.current;
                      if (!editorEl) return;

                      const img = editorEl.querySelector(
                        `img[data-type="image-placeholder"][data-id="${localId}"]`
                      ) as HTMLImageElement | null;

                      if (img) {
                        img.setAttribute("data-status", "local");
                      }
                    });

                    // 🔹 STORE references for later submit
                    pendingImagesRef.current.set(localId, file);
                    localBlobUrlsRef.current.set(localId, localUrl);

                    // 🔥 FORCE save AFTER image map is populated
                    saveDraftNow();
                  };

                  input.click();
                }}
                className="px-3 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                🖼️
              </button>
            )}

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
                  (mode !== PostTypes.ANSWER &&
                    mode !== PostTypes.VIDEO &&
                    selected.length === 0)
                }
                className={`px-6 py-2 rounded-lg text-white disabled:bg-gray-400 transition
                  ${
                    mode === PostTypes.QUESTION
                      ? "bg-orange-500 hover:bg-orange-600"
                      : "bg-blue-600 hover:bg-blue-700"
                  }
                `}
              >
                {mode === PostTypes.POST
                  ? submitting
                    ? "Submitting..."
                    : t("submit") || "Submit"
                  : mode === PostTypes.QUESTION
                  ? submitting
                    ? "Submitting Question..."
                    : "Ask Question"
                  : mode === PostTypes.ANSWER
                  ? submitting
                    ? "Submitting Answer..."
                    : "Answer"
                  : mode === PostTypes.VIDEO
                  ? "Post Video"
                  : "Placeholder"}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.form>
  );
}
